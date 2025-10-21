# Prehľad Aplikácie (Verzia 2.0 - Hybridný Model)

Tento projekt je dashboard pre klientov účtovnej firmy, postavený na platforme Next.js. Umožňuje klientom bezpečne sa prihlásiť a získať prístup k finančným dátam svojich firiem. Aplikácia poskytuje detailné vizualizácie kľúčových finančných ukazovateľov s dôrazom na rýchlosť a presnosť.

**Architektúra (Hybridný Model):**
Aplikácia využíva hybridný prístup k spracovaniu dát pre maximálny výkon a flexibilitu:
1.  **Backend (Firebase Cloud Functions):** Pri synchronizácii dát zo systému AbraFlexi sa na serveri vykonajú všetky náročné výpočty. Pripraví sa pred-spracovaný dátový model (`processedData`) obsahujúci agregované hodnoty pre Výkaz ziskov a strát a Súvahu.
2.  **Frontend (Next.js):** Hlavné záložky dashboardu (PnL, Súvaha, Cash Flow) načítavajú a zobrazujú už hotové `processedData`, čo zabezpečuje bleskové načítanie stránky. Záložka "Prieskumník dát" ako jediná pracuje so surovými dátami (`rawData`) pre detailnú analýzu na úrovni jednotlivých účtov.

Do databázy Firestore sa pre každú firmu ukladá jeden dokument (`financial_data/latest`), ktorý obsahuje:
*   `processedData`: Štruktúra s pred-počítanými mesačnými výsledkami.
*   `rawData`: Kompletné, nespracované dáta z AbraFlexi.
*   `lastSync`: Časová pečiatka poslednej synchronizácie.

## Dizajn a Funkcie

*   **Autentifikácia:** Prihlasovanie cez Firebase Authentication s rozlíšením rolí (admin, user).
*   **Hlavný Dashboard:** Bleskovo rýchly a interaktívny dashboard pre každú firmu, zobrazujúci kľúčové finančné výkazy.
*   **Admin Panel:** Správa spoločností (pridávanie, úprava, mazanie, synchronizácia) a správa používateľov (prideľovanie rolí, mazanie).
*   **Prieskumník Dát:** Detailný pohľad na všetky účty a ich pohyby, pracujúci so surovými dátami.

## Implementované Zmeny (Refaktoring na Hybridný Model)

Cieľom bolo odstrániť pomalé načítavanie spôsobené spracovaním dát na strane klienta a vytvoriť robustné a rýchle riešenie.

---

### **Fáza 1: Inteligentné Spracovanie na Backende (Dokončené)**

1.  **Obnovená a Vylepšená Logika v `sync-logic.js`:**
    *   **Výsledok:** Funkcie `processIncomeStatement` a `processBalanceSheet` teraz bežia na serveri a generujú optimalizovanú štruktúru `processedData`.
    *   **Súbory:** `functions/sync-logic.js`, `functions/account-groups.js`

2.  **Úprava Hlavnej Cloud Funkcie (`index.js`):**
    *   **Výsledok:** Funkcia `runCompanySync` teraz ukladá do Firestore hybridný dátový model (`processedData` + `rawData`).
    *   **Súbory:** `functions/index.js`

---

### **Fáza 2: Zjednodušenie a Zrýchlenie Frontendu (Dokončené)**

1.  **Refaktoring Hlavných Komponentov:**
    *   **Výsledok:** Komponenty `PnlTab.tsx`, `BalanceSheetTab.tsx` a `CashFlowTab.tsx` boli radikálne zjednodušené. Namiesto výpočtov už len priamo zobrazujú pred-spracované dáta z `processedData`.
    *   **Súbory:** `src/app/dashboard/[companyId]/pnl-tab.tsx`, `src/app/dashboard/[companyId]/balance-sheet-tab.tsx`, `src/app/dashboard/[companyId]/cash-flow-tab.tsx`

2.  **Úprava Hlavnej Stránky Dashboardu:**
    *   **Výsledok:** `page.tsx` teraz správne distribuuje dáta – `processedData` pre rýchle záložky a `companyId` pre Prieskumníka (ktorý si `rawData` ťahá samostatne).
    *   **Súbory:** `src/app/dashboard/[companyId]/page.tsx`

---

### **Fáza 3: Čistenie (Dokončené)**

1.  **Odstránenie `src/lib/accounting.ts`:**
    *   **Výsledok:** Keďže sa logika presunula späť na server, tento súbor bol odstránený, aby sa predišlo duplicite a nejasnostiam v kóde.

Týmto je projekt v stabilnom, rýchlom a udržateľnom stave.
