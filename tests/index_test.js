import { expect } from "chai";

import _ from "lodash";

import WEB_WORKER_PLUGIN_TEMPLATE from "../src/plugins/webWorkerTemplate.imjoy.html";
import WINDOW_PLUGIN_TEMPLATE from "../src/plugins/windowTemplate.imjoy.html";
// import NATIVE_PYTHON_PLUGIN_TEMPLATE from '../src/plugins/nativePythonTemplate.imjoy.html';
import WEB_PYTHON_PLUGIN_TEMPLATE from "../src/plugins/webPythonTemplate.imjoy.html";
import WEB_PYTHON_WINDOW_PLUGIN_TEMPLATE from "../src/plugins/webPythonWindowTemplate.imjoy.html";

import TEST_WEB_WORKER_PLUGIN_1 from "./testWebWorkerPlugin1.imjoy.html";
import TEST_WEB_WORKER_PLUGIN_2 from "./testWebWorkerPlugin2.imjoy.html";
import TEST_WINDOW_PLUGIN_1 from "./testWindowPlugin1.imjoy.html";

import * as imjoyCore from "../src/imjoyCore.js";

console.log("ImJoy Core version: " + imjoyCore.VERSION);

describe("ImJoy Core", async () => {
  let imjoy, wm, pm;
  before(function(done) {
    this.timeout(30000);
    imjoy = new imjoyCore.ImJoy({
      imjoy_api: {},
      default_base_frame: "/default_base_frame.html",
      default_rpc_base_url: "/",
      client_id: "123",
    });
    imjoy.event_bus.on("show_message", console.log);
    imjoy.event_bus.on("add_window", w => {
      const elem = document.createElement("DIV");
      elem.id = w.window_id;
      document.body.appendChild(elem);
    });
    wm = imjoy.wm; //window_manager
    pm = imjoy.pm; //plugin_manager
    imjoy.start({ workspace: "default" }).then(done);
  });

  it("should load default repositories", async () => {
    await pm.loadRepositoryList();
    expect(pm.repository_names).to.include("ImJoy Repository");
    expect(pm.repository_names).to.include("ImJoy Demos");
  });

  it("should save a new plugin", async () => {
    const code = _.clone(WEB_WORKER_PLUGIN_TEMPLATE);
    const pconfig = await pm.savePlugin({
      code: code,
      tag: null,
      origin: "__test__",
    });
    expect(pconfig.installed).to.be.true;
    expect(pconfig.name).to.equal("Untitled Plugin");
  });

  it("should load the new web-worker plugin", async () => {
    const code = _.clone(WEB_WORKER_PLUGIN_TEMPLATE);
    const plugin = await pm.reloadPlugin({ code: code });
    expect(plugin.name).to.equal("Untitled Plugin");
    expect(plugin.type).to.equal("web-worker");
    expect(typeof plugin.api.run).to.equal("function");
    await plugin.api.run({});
    plugin.terminate();
  }).timeout(20000);

  it("should load the new window plugin", async () => {
    const code = _.clone(WINDOW_PLUGIN_TEMPLATE);
    const plugin = await pm.reloadPlugin({ code: code });
    expect(plugin.name).to.equal("Untitled Plugin");
    expect(plugin.type).to.equal("window");
    expect(typeof plugin.api.run).to.equal("function");
    await plugin.api.run({});
    plugin.terminate();
  }).timeout(20000);

  // it('should load the new native-python plugin', async () => {
  //   const code = _.clone(NATIVE_PYTHON_PLUGIN_TEMPLATE)
  //   const plugin = await imjoy.pm.reloadPlugin({code: code})
  //   expect(plugin.name).to.equal('Untitled Plugin')
  //   expect(plugin.type).to.equal('native-python')
  //   expect(typeof plugin.api.run).to.equal('function')
  //   plugin.api.run({})
  // }).timeout(30000)

  it("should load the new web-python plugin", async () => {
    const code = _.clone(WEB_PYTHON_PLUGIN_TEMPLATE);
    const plugin = await pm.reloadPlugin({ code: code });
    expect(plugin.name).to.equal("Untitled Plugin");
    expect(plugin.type).to.equal("web-python");
    expect(typeof plugin.api.run).to.equal("function");
    await plugin.api.run({});
    plugin.terminate();
  }).timeout(100000);

  it("should load the new web-python-window plugin", async () => {
    const code = _.clone(WEB_PYTHON_WINDOW_PLUGIN_TEMPLATE);
    const plugin = await pm.reloadPlugin({ code: code });
    expect(plugin.name).to.equal("Untitled Plugin");
    expect(plugin.type).to.equal("web-python-window");
    expect(typeof plugin.api.run).to.equal("function");
    await plugin.api.run({});
    plugin.terminate();
  }).timeout(100000);

  it("should get plugin config from github", async () => {
    const config1 = await pm.getPluginFromUrl(
      "https://github.com/imjoy-team/ImJoy/blob/master/web/src/plugins/windowTemplate.imjoy.html"
    );
    expect(config1.name).to.equal("Untitled Plugin");
    expect(config1.type).to.equal("window");
  });

  it("should get plugin config from external url", async () => {
    const config2 = await pm.getPluginFromUrl(
      "https://lib.imjoy.io/plugin-example.html"
    );
    expect(config2.name).to.equal("My Awesome App");
    expect(config2.type).to.equal("rpc-window");
  });

  describe("ImJoy API", async () => {
    let plugin1;
    let plugin2;
    let pluginw;
    before(function(done) {
      this.timeout(20000);
      pm.reloadPlugin({ code: _.clone(TEST_WEB_WORKER_PLUGIN_1) }).then(p1 => {
        plugin1 = p1;
        expect(plugin1.name).to.equal("Test Web Worker Plugin 1");
        expect(plugin1.type).to.equal("web-worker");
        expect(imjoyCore.Joy.getTemplateByType(plugin1.name).init).to.include(
          "op-ui-option1"
        );
        expect(typeof plugin1.api.run).to.equal("function");
        pm.reloadPlugin({ code: _.clone(TEST_WEB_WORKER_PLUGIN_2) }).then(
          p2 => {
            plugin2 = p2;
            expect(plugin2.name).to.equal("Test Web Worker Plugin 2");
            expect(plugin2.type).to.equal("web-worker");
            expect(typeof plugin2.api.run).to.equal("function");

            pm.reloadPlugin({ code: _.clone(TEST_WINDOW_PLUGIN_1) }).then(
              pw => {
                pluginw = pw;
                expect(pluginw.name).to.equal("Test Window Plugin");
                expect(pluginw.type).to.equal("window");
                expect(typeof pluginw.api.run).to.equal("function");
                pm.createWindow(null, {
                  name: "new window",
                  type: "Test Window Plugin",
                }).then(wplugin => {
                  expect(typeof wplugin.add2).to.equal("function");
                  done();
                });
              }
            );
          }
        );
      });
    });

    it("should register and unregister", async () => {
      expect(Object.keys(plugin1.ops).length).to.equal(1);
      expect(await plugin1.api.test_register()).to.be.true;
      expect(
        imjoyCore.Joy.getTemplateByType(plugin1.name + "/LUT").init
      ).to.include("apply LUT");
      expect(Object.keys(plugin1.ops).length).to.equal(2);
      expect(await plugin1.api.test_unregister()).to.be.true;
      expect(Object.keys(plugin1.ops).length).to.equal(1);
      expect(function() {
        imjoyCore.Joy.getTemplateByType(plugin1.name + "/LUT");
      }).to.throw();
    });

    it("should create imjoy window", async () => {
      const count = wm.windows.length;
      expect(await plugin1.api.test_create_imjoy_window()).to.be.true;
      expect(wm.windows.length).to.equal(count + 1);
      expect(wm.windows[wm.windows.length - 1].name).to.equal("new image");
      await wm.windows[wm.windows.length - 1].close();
      expect(wm.windows.length).to.equal(count);
    });

    it("should create window", async () => {
      const count = wm.windows.length;
      expect(await plugin1.api.test_create_window()).to.be.true;
      expect(wm.windows.length).to.equal(count + 1);
      expect(wm.windows[wm.windows.length - 1].name).to.equal("new window");
      await wm.windows[wm.windows.length - 1].close();
      expect(wm.windows.length).to.equal(count);
    });

    it("should close imjoy window", async () => {
      expect(await plugin1.api.test_close_imjoy_window()).to.be.true;
    });

    it("should close window", async () => {
      expect(await plugin1.api.test_close_window()).to.be.true;
    });

    it("should run plugin", async () => {
      expect(await plugin1.api.test_run()).to.be.true;
    });

    it("should call plugin", async () => {
      expect(await plugin1.api.test_call()).to.be.true;
    });

    it("should get plugin", async () => {
      expect(await plugin1.api.test_get_plugin()).to.be.true;
    });

    it("should set/get config", async () => {
      expect(await plugin1.api.test_config()).to.be.true;
    });

    it("should get attachment", async () => {
      expect(await plugin1.api.test_get_attachment()).to.be.true;
    });

    it("should read and write with BrowserFS plugin", async () => {
      expect(await plugin1.api.test_fs()).to.be.true;
    });

    it("should work with custom encoding and decoding", async () => {
      expect(await plugin1.api.test_encoding_decoding()).to.be.true;
    });
  });
});
