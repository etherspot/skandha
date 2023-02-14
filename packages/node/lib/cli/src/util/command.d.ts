import { Options, Argv } from "yargs";
export declare type ICliCommandOptions<OwnArgs> = Required<{
    [key in keyof OwnArgs]: Options;
}>;
export interface ICliCommand<OwnArgs = Record<never, never>, ParentArgs = Record<never, never>, R = any> {
    command: string;
    describe: string;
    examples?: {
        command: string;
        description: string;
    }[];
    options?: ICliCommandOptions<OwnArgs>;
    subcommands?: ICliCommand<any, OwnArgs & ParentArgs>[];
    handler?: (args: OwnArgs & ParentArgs) => Promise<R>;
}
/**
 * Register a ICliCommand type to yargs. Recursively registers subcommands too.
 * @param yargs
 * @param cliCommand
 */
export declare function registerCommandToYargs(yargs: Argv, cliCommand: ICliCommand<any, any>): void;
//# sourceMappingURL=command.d.ts.map