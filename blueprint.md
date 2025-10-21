# Prehľad Aplikácie

Tento projekt je dashboard pre klientov účtovnej firmy, postavený na platforme Next.js. Umožňuje klientom bezpečne sa prihlásiť a získať prístup k finančným dátam svojich firiem. Aplikácia poskytuje detailné vizualizácie kľúčových finančných ukazovateľov.

**Stav Kódu (Verzia 1.5):** Po nasadení interaktívnych pohľadov boli identifikované chyby v agregácii dát. Nasleduje plán opráv na zabezpečenie korektnosti a robustnosti zobrazených údajov.

## Dizajn a Funkcie

*   **Autentifikácia:** Prihlasovanie cez Firebase Authentication.
*   **Hlavný Dashboard:** Interaktívny dashboard pre každú firmu.
*   **Admin Panel:** Správa spoločností, používateľov a prístupov.
*   **Prieskumník Dát:** Duálny pohľad na dáta:
    *   **Účtovný pohľad:** Detailný strom všetkých analytických účtov.
    *   **Manažérsky pohľad:** Agregovaný sumár kľúčových ukazovateľov.

## Plán Opráv a Vylepšení

Cieľom je opraviť chyby v agregácii dát, ktoré spôsobujú zobrazovanie nulových hodnôt, a vylepšiť prehľadnosť manažérskeho pohľadu.

---

### **Fáza 1: Oprava Dátovej Logiky (Backend)**

1.  **Dokončenie Výpočtov v `sync-logic.js`:**
    *   **Úloha:** Upraviť funkcie `processIncomeStatement` a `processBalanceSheet`. Na koniec každej funkcie pridať logiku, ktorá sčíta detailné kategórie do hlavných agregátov (`revenue_total`, `costs_total`, `assets`, `fixed_assets_total` atď.).
    *   **Súbory:** `functions/sync-logic.js`
    *   **Stav:** Pripravené na implementáciu.

---

### **Fáza 2: Sprehľadnenie Manažérskeho Pohľadu (Frontend)**

1.  **Vytvorenie Komponentu `ManagerialSummary`:**
    *   **Úloha:** Vytvoriť nový komponent, ktorý na jednej obrazovke zobrazí kľúčové ukazovatele z PnL a Súvahy. Nahradí súčasné duplicitné zobrazenie.
    *   **Súbory:** `src/app/dashboard/[companyId]/managerial-summary.tsx`, `src/app/dashboard/[companyId]/account-explorer-tab.tsx`
    *   **Stav:** Čaká na Fázu 1.

---

### **Fáza 3: Oprava a Vylepšenie Cash Flow (Frontend)**

1.  **Refaktoring `cash-flow-tab.tsx`:**
    *   **Úloha:** Opraviť výpočty, aby správne pracovali s korektnými dátami a predišlo sa `NaN` hodnotám.
    *   **Súbory:** `src/app/dashboard/[companyId]/cash-flow-tab.tsx`
    *   **Stav:** Čaká na Fázu 1.
