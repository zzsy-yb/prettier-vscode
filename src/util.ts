import * as os from "os";
import * as path from "path";
import * as ts from "typescript";
import { Uri, workspace } from "vscode";
import { PrettierVSCodeConfig } from "./types";

export function getWorkspaceRelativePath(
  filePath: string,
  pathToResolve: string
) {
  // In case the user wants to use ~/.prettierrc on Mac
  if (
    process.platform === "darwin" &&
    pathToResolve.indexOf("~") === 0 &&
    os.homedir()
  ) {
    return pathToResolve.replace(/^~(?=$|\/|\\)/, os.homedir());
  }

  if (workspace.workspaceFolders) {
    const folder = workspace.getWorkspaceFolder(Uri.file(filePath));
    return folder
      ? path.isAbsolute(pathToResolve)
        ? pathToResolve
        : path.join(folder.uri.fsPath, pathToResolve)
      : undefined;
  }
}

export function getConfig(uri?: Uri): PrettierVSCodeConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = workspace.getConfiguration(
    "prettier",
    uri
  ) as unknown as PrettierVSCodeConfig;

  // Some settings are disabled for untrusted workspaces
  // because they can be used for bad things.
  if (!workspace.isTrusted) {
    const newConfig = {
      ...config,
      prettierPath: undefined,
      configPath: undefined,
      ignorePath: ".prettierignore",
      documentSelectors: [],
      useEditorConfig: false,
      withNodeModules: false,
      resolveGlobalModules: false,
    };
    return newConfig;
  }

  return config;
}

export function getCursorIndexSkipImport(
  fileName: string,
  content: string
): number {
  let startPos = 0;
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.ES2015,
    /* setParentNodes */ true,
    ts.ScriptKind.TS
  );
  function visitNode(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
      case ts.SyntaxKind.ImportSpecifier:
        break;
      default:
        if (startPos === 0) {
          startPos = Math.max(startPos, node.getStart());
        }
    }
  }
  if (sourceFile) ts.forEachChild(sourceFile, visitNode);
  return startPos;
}
