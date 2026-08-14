import {spawn} from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const outputTailLimit = 64 * 1024;
let outputTail = "";

function recordOutput(chunk) {
    outputTail = (outputTail + chunk.toString()).slice(-outputTailLimit);
}

function runBuild() {
    return new Promise((resolve, reject) => {
        const child = spawn(npmCommand, ["run", "build"], {
            cwd: projectRoot,
            env: process.env,
            stdio: ["inherit", "pipe", "pipe"],
        });

        child.stdout.on("data", chunk => {
            process.stdout.write(chunk);
            recordOutput(chunk);
        });
        child.stderr.on("data", chunk => {
            process.stderr.write(chunk);
            recordOutput(chunk);
        });
        child.on("error", reject);
        child.on("close", (code, signal) => resolve({code, signal}));
    });
}

async function hasRequiredBuildOutput() {
    const requiredPaths = [
        "build/prod/index.html",
        "build/prod/assets/main.js",
    ];

    try {
        await Promise.all(requiredPaths.map(file => fs.access(path.join(projectRoot, file))));
        const moduleFiles = await fs.readdir(path.join(projectRoot, "build", "prod", "modules"));
        return moduleFiles.some(file => file.endsWith(".js"));
    } catch {
        return false;
    }
}

function isExpectedMountedFilesystemError() {
    const plainOutput = outputTail.replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "");
    return plainOutput.includes('Running "chmod:build" (chmod) task') &&
        /EPERM: operation not permitted, chmod ['"].*[\\/]build[\\/]prod['"]/.test(plainOutput);
}

const result = await runBuild();

if (result.signal) {
    throw new Error(`CyberChef build terminated by signal ${result.signal}.`);
}

if (result.code !== 0) {
    const expectedChmodError = isExpectedMountedFilesystemError();
    const buildOutputReady = await hasRequiredBuildOutput();

    if (!expectedChmodError || !buildOutputReady) {
        throw new Error(`CyberChef build failed with exit code ${result.code}.`);
    }

    console.warn("Ignoring the final chmod failure on the mounted Windows filesystem.");
}

await import("./prepareCloudflare.mjs");
