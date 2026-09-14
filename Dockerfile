# Image du service de traduction des demandes (`@lucy/api`).
#
# Le contexte de construction est le monorepo entier, et non `packages/api` :
# le service importe `@lucy/engine` par le lien de workspace, et ce lien n'a de
# sens que depuis la racine. C'est aussi ce qui garantit que le service et
# l'application partagent exactement la meme validation `parseSearchQuery`.

# --- Dependances -------------------------------------------------------------
# Etape separee pour que le cache ne soit invalide que par un changement de
# dependances, pas par une modification du code.
FROM node:22.22.2-slim AS deps
WORKDIR /app

# Les manifestes seuls : `npm ci` verifie l'arbre complet du verrou, il lui
# faut donc tous les `package.json` du monorepo, mais aucune source.
COPY package.json package-lock.json ./
COPY packages/engine/package.json ./packages/engine/
COPY packages/api/package.json ./packages/api/
COPY packages/app/package.json ./packages/app/

# Restreint au workspace du service : sans cela, l'image embarquerait la chaine
# Expo de l'application mobile, sans aucun rapport avec l'execution du service.
RUN npm ci --omit=dev --workspace @lucy/api --include-workspace-root

# --- Execution ---------------------------------------------------------------
FROM node:22.22.2-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/engine ./packages/engine
COPY packages/api ./packages/api

# Le service n'ecrit rien et n'a aucune raison d'etre root. Les sources lui
# appartiennent en lecture seule.
USER node

EXPOSE 8787

# `--experimental-strip-types` plutot qu'une etape de compilation : le moteur
# est importe directement en TypeScript, sans artefact intermediaire, donc ce
# qui tourne en production est le code qu'on lit dans le depot. Node resout le
# lien de workspace avant de retirer les types, d'ou l'absence de probleme avec
# la regle qui epargne `node_modules`.
CMD ["node", "--experimental-strip-types", "packages/api/src/server.ts"]
