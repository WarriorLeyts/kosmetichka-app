import { createContext, useContext } from "react";

/**
 * A screen shown inside another one on a computer (profile → «Мои данные», «Избранное»… on the right):
 * no «back» arrow in its title — the menu beside it is the way back.
 */
export const EmbeddedPane = createContext(false);
export const useEmbedded = () => useContext(EmbeddedPane);
