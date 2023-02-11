/* Leandro Silva (https://grafluxe.com) */

const { argv, cwd, exit } = require("process");
const { execSync } = require("child_process");
const { randomUUID } = require("crypto");
const { readFileSync, writeFileSync, readdirSync, rmSync } = require("fs");

const validOpts = {
  "-l": "list",
  "-d": "dryrun",
  "-i": "import",
  "-n": "new",
};

const fail = (msg) => {
  console.error(`\nAn Error Occurred\n=================\n${msg}\n`);
  exit(1);
};

const run = (exe, isDryrun, options) => {
  if (isDryrun) {
    console.log(`\nGit Command\n===========\n${exe}\n`);
    return "";
  }

  return execSync(exe, options).toString();
};

const validateCwd = () => {
  if (__dirname !== cwd()) {
    fail("This script must be executed from it's project directory");
  }
};

const validateOpts = (opts) => {
  const optsKeys = Object.keys(opts);
  const optVals = Object.values(validOpts);
  const hasValidKeys = optsKeys.every((optsKey) => optVals.includes(optsKey));

  if (optsKeys.length === 0) {
    fail("This script expects at least the 'import' (-i) option");
  }

  if (!hasValidKeys) {
    fail("An invalid option was used");
  }

  if (opts.list && optsKeys.length > 1) {
    fail("The 'list' (-l) option must not be accompanied by other options");
  }

  if (opts.new && (opts.new.length !== 1 || opts.new[0] === "")) {
    fail("The 'new' (-n) option expects a single argument assigned to it");
  }

  if (opts.import && opts.new) {
    fail("The 'import' (-i) and 'new' (-n) options cannot be run together");
  }

  if (opts.dryrun && !opts.import && !opts.new) {
    fail("The 'dryrun' (-d) option expects an accompanying option");
  }
};

const parseArgs = (inp, lastKey = null, out = {}) => {
  if (inp.length === 0) {
    return out;
  }

  const [head, ...tail] = inp;
  const isKey = /^-[a-z]$/.test(head);
  const curKey = isKey ? validOpts[head] : lastKey;

  if (!out[curKey]) {
    out[curKey] = [];
  } else if (!isKey) {
    out[curKey].push(head);
  }

  return parseArgs(tail, curKey, out);
};

const mergePackages = (packages, out = {}) => {
  for (const package of packages) {
    Object.entries(package).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        out[key] = [...(out[key] || []), ...val];
        return;
      }

      if (typeof val === "object") {
        out[key] = { ...out[key], ...mergePackages([val], out[key]) };
        return;
      }

      if (out.hasOwnProperty(key)) {
        out[`${key} <-collision-${randomUUID()}`] = val;
        return;
      }

      out[key] = val;
    });
  }

  return out;
};

const createPackageJsons = (isDryrun) => {
  try {
    const packageNames = readdirSync(".").filter((file) =>
      /^package\..+\.json$/.test(file)
    );

    if (packageNames.length >= 1) {
      const packages = packageNames.map((package) =>
        JSON.parse(readFileSync(package, "utf-8"))
      );

      const mergedPackage = mergePackages(packages);

      writeFileSync("package.json", JSON.stringify(mergedPackage, null, 2));

      packageNames.map((package) => rmSync(package));
    }
  } catch {
    fail("There was a problem merging your npm packages");
  }

  try {
    run("npm init", isDryrun, { stdio: "inherit" });
  } catch {}
};

const handleList = (isDryrun) => {
  const importList = run("git branch", isDryrun)
    .replace(/^(?!\s*config\/).+/gm, "")
    .replace(/ +/g, "• ")
    .trim();

  console.log(`\nAvailable Configs\n=================\n${importList}\n`);
};

const handleImport = (configs, isDryrun) => {
  try {
    const configBranches = run("git branch", isDryrun)
      .replace(/^(?!\s*config\/).+|^\s*config\//gm, "")
      .trim()
      .split("\n");

    const isValidConfig = configs.every((config) =>
      configBranches.includes(config)
    );

    if (!isValidConfig && !isDryrun) {
      fail("You're trying to import a config which does not exist");
    }

    configs.forEach((config) => {
      run(
        `git merge --allow-unrelated-histories -m "Add configs" config/${config}`,
        isDryrun
      );
    });

    if (isDryrun) {
      return;
    }

    rmSync("cc.js", { force: true });
    rmSync("README.md", { force: true });
    rmSync(".git", { force: true, recursive: true });
  } catch {
    fail("There was a problem importing your config");
  }

  createPackageJsons(isDryrun);
};

const handleNew = (config, isDryrun) => {
  if (config.includes("/")) {
    fail("Slash delimiters are not allowed");
  }

  if (readdirSync(".").includes("package.json")) {
    fail(
      "To avoid file collisions, 'package.json' files should have unique names following a 'package.{unique-name}.json' pattern"
    );
  }

  if (run("git ls-files --others", isDryrun)?.trim() === "") {
    if (!isDryrun) {
      fail("There are no files to add to your config");
    }
  }

  try {
    run(
      `git checkout --quiet --orphan config/${config} > /dev/null 2>&1`,
      isDryrun
    );
  } catch {
    fail(`A config name '${config}' already exists`);
  }

  if (!isDryrun) {
    rmSync("cc.js", { force: true });
    rmSync("README.md", { force: true });
  }

  run(
    `git add -A && git commit -m "Add config" && git checkout main`,
    isDryrun
  );

  if (!isDryrun) {
    console.log(`Your new config has been successfully created`);
  }
};

//

const opts = parseArgs(argv.slice(2));

validateCwd();
validateOpts(opts);

if (opts.list) {
  handleList(opts.dryrun);
}

if (opts.import) {
  handleImport(opts.import, opts.dryrun);
}

if (opts.new) {
  handleNew(opts.new[0], opts.dryrun);
}
