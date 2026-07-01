# CBDC Crisis Management Simulator — User Manual (English)

Version: v2.0 · Based on Paper R21  
Audience: CBDC policy researchers, central bank practitioners, financial stability analysts

---

## 1. What is this simulator?

This tool simulates **how different CBDC (Central Bank Digital Currency) design choices affect banking system stability during a financial crisis**.

It implements the simulation engine from the paper "Central Bank Digital Currency Design, Systemic Risk, and Financial Stability" (submitted to Journal of Financial Stability) and runs it directly in your web browser.

**Key research findings (Paper Table 4):**
- Dynamic Cap + Tiered remuneration design **reduces failure probability by 27.2pp** (0.4118 → 0.1400)
- Unconstrained CBDC is most dangerous
- Design ranking: DynCap+Tiered < Fixed Limit < Unconstrained CBDC

---

## 2. Interface Overview

### Top-Right Buttons
- **KOR / ENG buttons** (top-right corner): Click to switch the entire interface between Korean and English.

### Tab Structure
| Tab | Content |
|---|---|
| Simulation | Set parameters and view results |
| Paper Comparison | Compare your results to Paper Table 4 values |
| Monte Carlo | Probability distribution analysis |
| Sensitivity | Which variables matter most |

---

## 3. Parameter Descriptions (Plain Language)

### 📌 Country
Select from Korea, US, European Union, China, or Sweden.  
Each country has a different banking network density pre-configured.
- Korea: density 0.82 (high → contagion spreads fast)
- Sweden: digital payment rate 0.95 (highest)

### 📌 Shock Severity (S)
**Plain language:** How severe the financial crisis is.
- 0.0 = No crisis
- 0.35 = Moderate crisis (default)
- 0.75 = Severe crisis (Paper Table 4 benchmark)
- 1.0 = Catastrophic crisis

### 📌 Digital Payment Rate (D)
**Plain language:** The proportion of the population using digital payments.  
A higher rate means funds can flow into CBDC faster during a crisis.
- Korea is set at 0.92 (92% digital payment adoption)

### 📌 Bank Concentration (C)
**Plain language:** How dominant a few large banks are.  
Higher concentration means that if one bank fails, the shock spreads more easily.

### 📌 Cash Buffer Ratio
**Plain language:** The proportion of money people keep as physical cash.  
A higher cash buffer partially insulates against CBDC flight.

### 📌 Holding Limit (KRW)
**Plain language:** The maximum amount of CBDC one person can hold.  
Lower limits reduce bank-run risk but also reduce usability.
- Paper optimal value: **5.5M KRW** (~USD 4,000)
- Default: 20M KRW

### 📌 Dynamic Cap
**Plain language:** Automatically lowers the holding limit during a crisis.  
When activated, it restricts CBDC outflows automatically during a bank run.

### 📌 LOLR (Lender of Last Resort)
**Plain language:** The central bank injects emergency funds during a crisis.  
Activates automatically when stress exceeds 0.45 (Paper Section 3.1).

### 📌 Tiered Remuneration
**Plain language:** Pays progressively lower interest on larger CBDC holdings,  
discouraging people from holding too much CBDC.

### 📌 Monte Carlo Runs
**Plain language:** How many times to repeat the simulation with slight random variations.  
More runs = more accurate results, but slower. Default 100 is recommended.

---

## 4. Reading the Results

### Failure Probability P(Fail)
The probability that the banking system collapses.
- 0.0 = 0% (completely safe)
- 0.14 = 14% (Paper benchmark: Korea DynCap+Tiered optimal)
- 0.41 = 41% (Paper benchmark: Unconstrained CBDC)

### Stability
Formula: `1 / (1 + exp(13 × (stress - threshold)))` (Paper Eq. 1)  
Higher is better. Above 0.5 indicates a stable state.

### Stress
Overall financial system pressure index. Lower is better.

### Welfare Index
Combines benefits (payment efficiency, financial inclusion, innovation) minus costs (failure, disintermediation, operational risk).  
Formula (Paper Section 3.6):
```
W = 0.25·PayEff + 0.10·Inclusion + 0.15·Innovation
    - 0.30·Risk - 0.15·Disintermediation - 0.05·Oper + 0.30
```

### Stress Bar Chart
Shows daily stress levels over 90 days. Taller bars = more stress on that day.

### Key Drivers
Shows which factors increase or decrease failure probability.
- 🔴 Red border = risk-increasing factor
- 🟢 Green border = risk-reducing factor

---

## 5. Using the Paper Comparison Tab

This tab lets you directly compare your simulation results to the paper's four CBDC design benchmarks.

**Note:** Absolute values may differ. Reasons:
- The paper uses a Python MT19937 v6.0 engine with N=300 Monte Carlo averaging
- This simulator uses a simplified browser-side engine
- **Design rankings are consistent** (DynCap+Tiered is always safest)

---

## 6. Using CSV Downloads

After running a simulation, click the **CSV button** to download 90-day time series data.

| Column | Description |
|---|---|
| day | Day number (1–90) |
| outflow | CBDC outflow rate |
| failed | Cumulative fraction of failed banks |
| stability | System stability index |
| stress | Stress index |
| welfare | Welfare index |
| lolr_support | LOLR intervention magnitude |

---

## 7. Paper Alignment Summary

| Parameter | Code Key | Value | Paper Source |
|---|---|---|---|
| C×S interaction coefficient | theta2 | **0.2217** | Paper Table 2 |
| Digital outflow sensitivity | outflowDigital | 0.35 | ACF23 Table 3 |
| Risk outflow sensitivity | outflowRisk | 0.16 | KS23 Table 2 |
| Cap base outflow | outflowCapBase | 0.05 | BoK (2023) §4.2 |
| Cap slope outflow | outflowCapSlope | 0.06 | BoK (2023) §4.2 |
| Cash buffer coefficient | cashBuffer | 0.35 | ACF23 Eq.(5) |
| Disintermediation coefficient | disinterOutflow | 0.95 | KS23 Table 2 |
| Stability sigmoid k | stabilityK | 13 | Paper Eq.1 |
| LOLR trigger threshold | lolrTrigger | 0.45 | Paper Section 3.1 v6 |

---

## 8. Frequently Asked Questions

**Q: Why do my results differ from the paper?**  
A: The paper uses a Python MT19937 engine (seed=20260618) with N=300 Monte Carlo averaging. This web simulator is a simplified browser-based version. The **design rankings** (which design is safest) are consistent with the paper.

**Q: What happens if I set the holding limit to 5.5M KRW?**  
A: This is the paper's risk-minimizing threshold for Korea (Paper Table 7a). Note that this is approximately 1/9 of Korea's deposit insurance limit (50M KRW), so real-world policy application requires comprehensive evaluation.

**Q: Why is no design safe for Sweden?**  
A: Sweden has the highest digital payment rate (D=0.95) and the lowest stability threshold (θ=0.60), making the system near the failure boundary under all cap levels. See Paper Section 6.6.

**Q: What does the Sobol sensitivity tab show?**  
A: Total sensitivity indices (Sᴛ) from Paper Table 6, showing how much each variable influences system stability. The Holding Cap (Sᴛ=0.44) is the dominant lever, followed by Shock Severity (0.31) and Digital Rate (0.17).

---

*This manual is based on Paper JFS R21.*
