const readJson = require("load-json-file");
const getPackages = require("get-yarn-workspaces");
const { yellow } = require("chalk");
const fs = require("fs-extra");
const nodePath = require("path");
const glob = require("glob");

const PROJECT_ROOT = nodePath.join(__dirname, "..", "..");
const rootPackageJson = readJson.sync(nodePath.join(PROJECT_ROOT, "package.json"));

module.exports.PROJECT_ROOT = PROJECT_ROOT;
module.exports.rootPackageJson = rootPackageJson;

let packagesCache;

module.exports.getPackages = (args = {}) => {
    if (packagesCache) {
        return packagesCache;
    }

    packagesCache = getPackages()
        .map(path => {
            if (args.includes) {
                if (!path.includes(args.includes)) {
                    return null;
                }
            }

            const packageJsonPath = path + "/package.json";
            const tsConfigJsonPath = path + "/tsconfig.json";
            const tsConfigBuildJsonPath = path + "/tsconfig.build.json";

            let tsConfigJson, tsConfigBuildJson;
            const packageJson = readJson.sync(packageJsonPath);

            try {
                tsConfigJson = readJson.sync(tsConfigJsonPath);
            } catch {
                if (fs.existsSync(tsConfigJsonPath)) {
                    console.log(
                        yellow(
                            `Error occurred while trying to read ${tsConfigJsonPath}. File exists, but it seems there might be a syntax error in the file.`
                        )
                    );
                }
            }

            try {
                tsConfigBuildJson = readJson.sync(tsConfigBuildJsonPath);
            } catch {
                if (fs.existsSync(tsConfigBuildJsonPath)) {
                    console.log(
                        yellow(
                            `Error occurred while trying to read ${tsConfigBuildJsonPath}. File exists, but it seems there might be a syntax error in the file.`
                        )
                    );
                }
            }

            const testsFolderPath = path + "/__tests__";
            let hasTests = false;
            if (fs.existsSync(testsFolderPath)) {
                const files = glob.sync(`${testsFolderPath}/**/**.test.ts`);
                hasTests = Array.isArray(files) && files.length;
            }

            try {
                return {
                    isTs: Boolean(tsConfigJson || tsConfigBuildJson),
                    hasTests,
                    packageFolder: path,
                    packageFolderRelativePath: path.replace(`${PROJECT_ROOT}/`, ""),
                    packageJsonPath,
                    tsConfigJsonPath,
                    tsConfigBuildJsonPath,
                    packageJson,
                    tsConfigJson,
                    tsConfigBuildJson
                };
            } catch {
                console.log(yellow(`Ignoring ${path}/package.json`));
                return null;
            }
        })
        .filter(Boolean);

    return packagesCache;
};

module.exports.getPackage = nameOrPackageFolder => {
    return module.exports
        .getPackages()
        .find(
            item =>
                item.packageJson.name === nameOrPackageFolder ||
                item.packageFolder === nameOrPackageFolder
        );
};
