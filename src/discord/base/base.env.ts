import ck from "chalk";
import { z, ZodObject, ZodRawShape } from "zod";
import { brBuilder } from "@magicyan/discord";
import chalk from "chalk";

const x = chalk.red("✖︎");
const w = chalk.yellow("▲");

/**
 * validateEnv — versión compatible con Zod v3
 */
export function validateEnv<T extends ZodRawShape>(schema: ZodObject<T>) {
    // En Zod v3 no existe .loose(), se reemplaza por .passthrough()
    const result = schema.passthrough().safeParse(process.env);

    if (!result.success) {
        const u = ck.underline;

        for (const error of result.error.issues) {
            const { path, message } = error;
            const varName = Array.isArray(path) ? path.join(".") : String(path);
            const varValue = process.env[varName];
            const isEmpty = varValue === "";
            const isMissing = varValue === undefined;

            console.error(`${x} ENV VAR → ${u.bold(varName)} ${message}`);

            if (isEmpty) {
                console.log(
                    ck.dim(
                        `└ Variable está definida pero ${ck.yellow("vacía")} en el archivo .env.`
                    )
                );
            } else if (isMissing) {
                console.log(
                    ck.dim(
                        `└ Variable ${ck.yellow("no está definida")} en el archivo .env.`
                    )
                );
            } else if ((error as any).code == "invalid_type") {
                console.log(
                    ck.dim(
                        `└ Expected: ${u.green((error as any).expected)} | Received: ${u.red((error as any).input)}`
                    )
                );
            }
        }

        console.log();

        console.warn(
            brBuilder(
                `${w} Some ${ck.magenta("environment variables")} are undefined.`,
                `  Here are some ways to avoid these errors:`,
                `- Run the project using ${u.bold("./package.json")} scripts that include the ${ck.blue("--env-file")} flag.`,
                `- Inject the variables into the environment manually or through a tool`,
                "",
                chalk.blue(
                    `↗ ${chalk.underline("https://constatic-docs.vercel.app/docs/discord/conventions/env")}`
                ),
                ""
            )
        );

        process.exit(1);
    }

    console.log(ck.green(`${ck.magenta("☰ Environment variables")} loaded ✓`));

    return result.data as Record<string, string> & z.infer<typeof schema>;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            "Use import { env } from \"#settings\"": never;
        }
    }
}
