const qunit = require("qunit");
const path = require("path");
const mod = qunit.module;
const test = qunit.test;
const WebExtReact = require("../../index.js");
const fs = require("fs-extra");

mod("build", (hooks) => {
  hooks.beforeEach(() => {
    this.cwd = process.cwd();
    this.dummyPath = path.join(this.cwd, "tests", "dummy");
    this.buildPath = path.join(this.dummyPath, "build");
    fs.removeSync(this.buildPath);
    process.chdir(this.dummyPath);
    this.webExtReact = new WebExtReact();
  });

  hooks.afterEach(() => {
    process.chdir(this.cwd);
  });

  test("it builds app", async (assert) => {
    await this.webExtReact.buildApp();
    assert.ok(fs.existsSync(this.buildPath), "build dir exists");
    assert.ok(
      fs.existsSync(
        path.join(this.buildPath, "asset-manifest.json"),
        "asset manifest exists"
      )
    );
  });

  test("it builds ext", async (assert) => {
    this.extDir = await this.webExtReact.build();
    assert.ok(fs.existsSync(this.buildPath), "build dir exists");
    assert.ok(fs.existsSync(this.extDir), "extension dir exists");
    assert.ok(
      fs.existsSync(path.join(this.extDir, "manifest.json")),
      "manifest.json exists"
    );
    assert.ok(fs.existsSync(path.join(this.extDir, "static")), "static exists");
  });

  mod("manifest.json", (hooks) => {
    hooks.beforeEach(() => {
      this.manifest = JSON.parse(
        fs.readFileSync(path.join(this.extDir, "manifest.json"))
      );
    });

    test("content_scripts", (assert) => {
      assert.equal(this.manifest.content_scripts[0].js.length, 4);
      [
        /is-content-scripts.js/,
        /runtime-main.*.js/,
        /2.*.chunk.js/,
        /main.*.chunk.js/,
      ].forEach((regex, index) => {
        let script = this.manifest.content_scripts[0].js[index];
        assert.ok(regex.test(script), script);
      });
    });

    test("background", (assert) => {
      assert.ok(true);
      const backgroundPagePath = path.join(this.extDir, "background-page.html");
      assert.ok(
        fs.existsSync(backgroundPagePath),
        `${backgroundPagePath} exists`
      );
    });
  });

  mod("browser action only", (hooks) => {
    hooks.beforeEach(() => {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#Defining_a_getter_on_existing_objects_using_defineProperty
      Object.defineProperty(this.webExtReact, "extManifest", {
        get: function () {
          return {
            browser_action: {
              default_popup: "popup.html",
            },
          };
        },
      });
    });

    test("it builds ext", async (assert) => {
      this.extDir = await this.webExtReact.build();
      assert.ok(
        fs.existsSync(path.join(this.extDir, "manifest.json")),
        "manifest.json exists"
      );

      const popupPath = path.join(this.extDir, "popup.html");
      assert.ok(fs.existsSync(popupPath), `${popupPath} exists`);
      const backgroundPagePath = path.join(this.extDir, "background-page.html");
      assert.notOk(
        fs.existsSync(backgroundPagePath),
        `${backgroundPagePath} doesn't exists`
      );
    });
  });
});
