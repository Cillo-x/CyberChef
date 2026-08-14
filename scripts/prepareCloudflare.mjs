import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, "build", "prod");
const deployDir = path.join(projectRoot, "deploy");
const cyberChefDir = path.join(deployDir, "cyberchef");

const excludedFiles = new Set([
    "BundleAnalyzerReport.html",
    "sha256digest.txt",
]);

function isExcluded(relativePath) {
    const basename = path.basename(relativePath);
    return excludedFiles.has(basename) ||
        basename.endsWith(".zip") ||
        (basename.startsWith("CyberChef_v") && basename.endsWith(".html"));
}

try {
    await fs.access(path.join(sourceDir, "index.html"));
} catch {
    throw new Error("build/prod/index.html is missing. Run npm run build first.");
}

await fs.rm(deployDir, {recursive: true, force: true});
await fs.mkdir(cyberChefDir, {recursive: true});
await fs.cp(sourceDir, cyberChefDir, {
    recursive: true,
    filter: (source) => !isExcluded(path.relative(sourceDir, source)),
});

console.log(`Prepared ${path.relative(projectRoot, cyberChefDir)}`);
