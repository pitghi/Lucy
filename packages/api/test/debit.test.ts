import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { adresseClient, creerLimiteDebit } from '../src/debit.ts';

/**
 * Ce qui est verifie ici, c'est la depense : le service porte la cle d'API, et
 * une URL publique sans plafond est une cle ouverte a qui la trouve. Le temps
 * est injecte plutot qu'attendu — un test qui dort une minute ne se lance plus.
 */

test('le plafond est atteint puis relache a la sortie de la fenetre', () => {
  const limite = creerLimiteDebit(3, 60_000);

  assert.equal(limite.autorise('a', 1_000), true);
  assert.equal(limite.autorise('a', 2_000), true);
  assert.equal(limite.autorise('a', 3_000), true);
  assert.equal(limite.autorise('a', 4_000), false);

  // Le premier appel sort de la fenetre : une place se libere, une seule.
  assert.equal(limite.autorise('a', 61_500), true);
  assert.equal(limite.autorise('a', 61_600), false);
});

test('une tentative refusee ne repousse pas la sortie de penalite', () => {
  const limite = creerLimiteDebit(1, 60_000);

  assert.equal(limite.autorise('a', 1_000), true);
  // Un client qui insiste pendant toute la fenetre...
  for (let t = 2_000; t < 61_000; t += 1_000) {
    assert.equal(limite.autorise('a', t), false);
  }
  // ...retrouve son acces a l'heure prevue par son seul appel accepte.
  assert.equal(limite.autorise('a', 61_001), true);
});

test('les adresses sont comptees separement', () => {
  const limite = creerLimiteDebit(1, 60_000);

  assert.equal(limite.autorise('a', 1_000), true);
  assert.equal(limite.autorise('b', 1_000), true);
  assert.equal(limite.autorise('a', 1_100), false);
  assert.equal(limite.autorise('b', 1_100), false);
});

test('un plafond absurde desactive la limite plutot que le service', () => {
  for (const max of [0, -1, Number.NaN]) {
    const limite = creerLimiteDebit(max, 60_000);
    assert.equal(limite.autorise('a', 1_000), true);
    assert.equal(limite.autorise('a', 1_001), true);
  }
});

test('la table ne grossit pas indefiniment sous un flot d adresses distinctes', () => {
  const limite = creerLimiteDebit(10, 60_000);

  // Sans plafond de cles, le garde-fou contre le cout deviendrait un moyen
  // d'epuiser la memoire du service.
  for (let i = 0; i < 25_000; i += 1) limite.autorise(`ip-${i}`, 1_000 + i);

  assert.ok(limite.taille <= 10_000, `taille ${limite.taille}`);
});

test('les cles expirees sont oubliees', () => {
  const limite = creerLimiteDebit(10, 60_000);

  for (let i = 0; i < 12_000; i += 1) limite.autorise(`ip-${i}`, 1_000);
  // Bien apres la fenetre, plus rien de ce flot ne doit rester suivi.
  for (let i = 0; i < 2_000; i += 1) limite.autorise(`tardif-${i}`, 500_000);

  assert.ok(limite.taille <= 2_000, `taille ${limite.taille}`);
});

function fakeReq(headers: Record<string, string | string[]>, remote?: string): IncomingMessage {
  return { headers, socket: { remoteAddress: remote } } as unknown as IncomingMessage;
}

test('sans en-tete configure, l adresse de la connexion fait foi', () => {
  // L'en-tete est present mais n'est pas celui qu'on a designe : le lire
  // laisserait n'importe qui choisir son propre seau de comptage.
  const req = fakeReq({ 'x-forwarded-for': '1.2.3.4' }, '10.0.0.1');

  assert.equal(adresseClient(req, ''), '10.0.0.1');
});

test('l en-tete designe est lu, et seulement sa premiere valeur', () => {
  const req = fakeReq({ 'fly-client-ip': '203.0.113.7, 198.51.100.2' }, '10.0.0.1');

  assert.equal(adresseClient(req, 'fly-client-ip'), '203.0.113.7');
});

test('un en-tete vide retombe sur l adresse de la connexion', () => {
  assert.equal(adresseClient(fakeReq({ 'fly-client-ip': '   ' }, '10.0.0.1'), 'fly-client-ip'), '10.0.0.1');
  assert.equal(adresseClient(fakeReq({}, '10.0.0.1'), 'fly-client-ip'), '10.0.0.1');
});

test('sans adresse identifiable, tout tombe dans le meme seau', () => {
  assert.equal(adresseClient(fakeReq({}), ''), 'inconnu');
});
