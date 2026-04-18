import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Superadmin safety net.
 *
 * El cliente service-role (`lib/supabase/platform-admin.server.ts`) y la env
 * var `SUPABASE_SERVICE_ROLE_KEY` bypasean TODAS las policies RLS. Un import
 * accidental desde fuera del panel superadmin sería una escalación total.
 *
 * Bloqueamos via ESLint cualquier acceso a ambos símbolos EXCEPTO desde:
 *   - lib/superadmin/**
 *   - app/(superadmin)/**
 *   - lib/supabase/platform-admin.server.ts (la definición misma)
 */
const superadminAllowlist = [
  "lib/superadmin/**",
  "app/(superadmin)/**",
  "lib/supabase/platform-admin.server.ts",
  // Invitations / accept-invite flow usa service-role a través de admin.server.ts
  "lib/supabase/admin.server.ts",
  "lib/invitations/**",
  "app/accept-invite/**",
  // Cron jobs corren como procesos de Vercel (auth via CRON_SECRET), no como
  // usuarios; necesitan service-role para recorrer todas las orgs.
  "app/api/cron/**",
];

const restrictedSuperadmin = {
  files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
  ignores: superadminAllowlist,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "**/lib/supabase/platform-admin.server",
              "@/lib/supabase/platform-admin.server",
              "**/lib/supabase/admin.server",
              "@/lib/supabase/admin.server",
            ],
            message:
              "Los clientes service-role bypasean RLS. Sólo pueden importarse desde rutas allowlisted (superadmin o invitations).",
          },
        ],
      },
    ],
    "no-restricted-properties": [
      "error",
      {
        object: "process",
        property: "env",
        message:
          "Leer SUPABASE_SERVICE_ROLE_KEY sólo está permitido dentro del panel superadmin. Si necesitas otra env var, accede con bracket notation o refactoriza.",
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='SUPABASE_SERVICE_ROLE_KEY']",
        message:
          "SUPABASE_SERVICE_ROLE_KEY sólo puede leerse desde lib/superadmin/** o app/(superadmin)/** o lib/supabase/platform-admin.server.ts.",
      },
      {
        selector:
          "Literal[value='SUPABASE_SERVICE_ROLE_KEY']",
        message:
          "Referencia a SUPABASE_SERVICE_ROLE_KEY fuera del perímetro superadmin.",
      },
    ],
  },
};

// La regla `no-restricted-properties` de arriba es demasiado agresiva
// (rompería cualquier `process.env.X`). La dejamos desactivada y confiamos
// en `no-restricted-syntax` que sólo captura la key específica.
delete restrictedSuperadmin.rules["no-restricted-properties"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  restrictedSuperadmin,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
