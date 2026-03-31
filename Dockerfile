FROM node:20-alpine AS base

# 1. Dependencias
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# 2. Constructor (Builder)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos de construcción
ARG MERCADO_PAGO_ACCESS_TOKEN
ARG RESEND_API_KEY
ARG DATABASE_URL

# --- TRUCO DE INGENIERÍA: Crear .env para que Next.js lo vea sí o sí ---
RUN echo "MERCADO_PAGO_ACCESS_TOKEN=${MERCADO_PAGO_ACCESS_TOKEN}" > .env
RUN echo "RESEND_API_KEY=${RESEND_API_KEY}" >> .env
RUN echo "DATABASE_URL=${DATABASE_URL}" >> .env

RUN npx prisma generate
RUN npm run build

# 3. Ejecutor (Runner)
FROM base AS runner
WORKDIR /app

# Corregimos el formato de ENV con el signo = para evitar warnings
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiamos solo lo necesario del standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./prisma.config.js

EXPOSE 3000
CMD ["node", "server.js"]
