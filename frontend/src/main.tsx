
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import "./styles/tokens.css";

try {
	if (window.location.pathname.length > 1 && window.location.pathname.endsWith("/")) {
		const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
		window.history.replaceState(null, "", normalizedPath + window.location.search + window.location.hash);
	}

	const pendingRedirect = sessionStorage.getItem("velocis:spa-redirect");
	const currentPath = window.location.pathname + window.location.search + window.location.hash;
	const isRootLikePath = window.location.pathname === "/" || window.location.pathname === "/index.html";

	if (pendingRedirect) {
		sessionStorage.removeItem("velocis:spa-redirect");
		if (isRootLikePath && pendingRedirect !== currentPath) {
			// Recover the deep link that originally hit a static-host 404 page.
			window.history.replaceState(null, "", pendingRedirect);
		}
	}
} catch {
	// Ignore browser storage/history issues and continue with normal app boot.
}

createRoot(document.getElementById("root")!).render(<App />);
