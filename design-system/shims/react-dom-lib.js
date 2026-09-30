import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
window.ReactDOM = { ...ReactDOM, ...ReactDOMClient };
