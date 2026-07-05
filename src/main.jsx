import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { supabase } from "./supabaseClient";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App supabase={supabase} />
  </React.StrictMode>
);
