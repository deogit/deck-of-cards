import { Application } from "pixi.js";

import { BlackjackScene } from "./scenes/BlackjackScene";

const appHost = document.getElementById("pixi-container");

if (!appHost) {
  throw new Error("Missing #pixi-container root element.");
}

const app = new Application();
let scene: BlackjackScene | null = null;

const syncLayout = () => {
  scene?.resize(app.screen.width, app.screen.height);
};

const syncVisibility = () => {
  if (document.hidden) {
    app.stop();
    return;
  }

  app.start();
};

void (async () => {
  await app.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    resizeTo: window,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });

  appHost.appendChild(app.canvas);

  scene = new BlackjackScene(app);

  app.stage.addChild(scene.view);
  syncLayout();

  window.addEventListener("resize", syncLayout);
  document.addEventListener("visibilitychange", syncVisibility);

  app.ticker.add(() => {
    scene?.update(app.ticker.deltaMS);
  });
})();
