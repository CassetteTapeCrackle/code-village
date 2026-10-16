// first, so the renamed keys are in place before any module reads them
import "./store/migrate";
import { mount } from "svelte";
import App from "./App.svelte";
import "./styles/palette.css";
import "./styles/tokens.css";
import "./styles/kit.css";

mount(App, { target: document.getElementById("app")! });

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => void navigator.serviceWorker.register("./sw.js"));
}
