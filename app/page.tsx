"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateShortCircuit,
  IDENTITY_INITIAL,
  ReportModule,
  SHORT_INITIAL,
  ShortCircuitModule,
  type IdentityInput,
  type ShortCircuitInput,
} from "./IndustrialModules";

type TabId = "motor" | "capacitor" | "protecao" | "curto" | "memoria";
type IconName = "bolt" | "wave" | "shield" | "moon" | "sun" | "network" | "document" | "install";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type NumberKey =
  | "cv"
  | "voltage"
  | "powerFactor"
  | "efficiency"
  | "targetPowerFactor"
  | "selectedKvar"
  | "designFactor"
  | "temperatureFactor"
  | "groupingFactor";

type ProjectState = {
  cv: number;
  voltage: number;
  powerFactor: number;
  efficiency: number;
  targetPowerFactor: number;
  selectedKvar: number;
  designFactor: number;
  temperatureFactor: number;
  groupingFactor: number;
  installationMethod: "B1" | "B2";
};

const INITIAL_STATE: ProjectState = {
  cv: 25,
  voltage: 220,
  powerFactor: 0.84,
  efficiency: 0.89,
  targetPowerFactor: 0.95,
  selectedKvar: 7.5,
  designFactor: 1.5,
  temperatureFactor: 1,
  groupingFactor: 1,
  installationMethod: "B1",
};

const CABLE_TABLE = [
  { section: 1.5, B1: 15.5, B2: 15 },
  { section: 2.5, B1: 21, B2: 20 },
  { section: 4, B1: 28, B2: 27 },
  { section: 6, B1: 36, B2: 34 },
  { section: 10, B1: 50, B2: 46 },
  { section: 16, B1: 68, B2: 62 },
  { section: 25, B1: 89, B2: 80 },
  { section: 35, B1: 110, B2: 99 },
  { section: 50, B1: 134, B2: 118 },
  { section: 70, B1: 171, B2: 149 },
  { section: 95, B1: 207, B2: 179 },
  { section: 120, B1: 239, B2: 206 },
  { section: 150, B1: 275, B2: 236 },
  { section: 185, B1: 314, B2: 268 },
  { section: 240, B1: 370, B2: 313 },
] as const;

const BREAKERS = [2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160];
const AC6B_CONTACTORS = [
  { model: "CWBC9", current: 17 },
  { model: "CWBC18", current: 22 },
  { model: "CWBC25", current: 28 },
  { model: "CWBC32", current: 40 },
  { model: "CWBC50", current: 60 },
  { model: "CWBC65", current: 77 },
  { model: "CWBC80", current: 93 },
] as const;

const format = (value: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function Field({
  label,
  value,
  onChange,
  unit,
  step = "any",
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: string;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Formula({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="formula-box">
      <span>{title}</span>
      <code>{children}</code>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
  accent = "cyan",
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: "cyan" | "amber" | "green" | "neutral";
}) {
  return (
    <article className={`result-card result-${accent}`}>
      <span>{label}</span>
      <strong>
        {value} {unit && <small>{unit}</small>}
      </strong>
    </article>
  );
}

function Icon({ name }: { name: IconName }) {
  const paths = {
    bolt: <path d="m13 2-8 11h6l-1 9 8-12h-6z" />,
    wave: <path d="M3 12h3l2-6 4 12 3-9 2 3h4" />,
    shield: <path d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6z" />,
    network: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="5" cy="19" r="2" /><path d="M7 6.2 17 11M7 17.8 17 13M5 7v10" /></>,
    document: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
    install: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" /></>,
    moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("motor");
  const [values, setValues] = useState<ProjectState>(INITIAL_STATE);
  const [shortValues, setShortValues] = useState<ShortCircuitInput>(SHORT_INITIAL);
  const [identity, setIdentity] = useState<IdentityInput>(IDENTITY_INITIAL);
  const [dark, setDark] = useState(true);
  const [saved, setSaved] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("cei-core-values");
    const storedShort = window.localStorage.getItem("cei-short-values");
    const storedIdentity = window.localStorage.getItem("cei-identity");
    const theme = window.localStorage.getItem("cei-theme");
    if (stored) {
      try {
        setValues({ ...INITIAL_STATE, ...JSON.parse(stored) });
      } catch {
        // Mantém os valores iniciais quando o armazenamento está inválido.
      }
    }
    if (storedShort) {
      try { setShortValues({ ...SHORT_INITIAL, ...JSON.parse(storedShort) }); } catch { /* mantém padrão */ }
    }
    if (storedIdentity) {
      try { setIdentity({ ...IDENTITY_INITIAL, ...JSON.parse(storedIdentity) }); } catch { /* mantém padrão */ }
    }
    if (theme) setDark(theme === "dark");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.localStorage.setItem("cei-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("cei-core-values", JSON.stringify(values));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 900);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [values]);

  useEffect(() => {
    window.localStorage.setItem("cei-short-values", JSON.stringify(shortValues));
  }, [shortValues]);

  useEffect(() => {
    window.localStorage.setItem("cei-identity", JSON.stringify(identity));
  }, [identity]);

  const update = (key: NumberKey, value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  const calc = useMemo(() => {
    const cv = Math.max(values.cv, 0);
    const voltage = Math.max(values.voltage, 1);
    const fp = clamp(values.powerFactor, 0.01, 1);
    const efficiency = clamp(values.efficiency, 0.01, 1);
    const target = clamp(values.targetPowerFactor, fp, 0.9999);
    const mechanicalW = cv * 735.5;
    const absorbedW = mechanicalW / efficiency;
    const apparentVA = absorbedW / fp;
    const phi = Math.acos(fp);
    const tanPhi = Math.tan(phi);
    const reactiveVar = absorbedW * tanPhi;
    const currentA = absorbedW / (Math.sqrt(3) * voltage * fp);
    const lossesW = absorbedW - mechanicalW;
    const targetTan = Math.tan(Math.acos(target));
    const requiredKvar = (absorbedW * (tanPhi - targetTan)) / 1000;
    const selectedVar = Math.max(values.selectedKvar, 0) * 1000;
    const capacitorCurrent = selectedVar / (Math.sqrt(3) * voltage);
    const remainingVar = reactiveVar - selectedVar;
    const correctedVA = Math.hypot(absorbedW, remainingVar);
    const correctedFp = correctedVA > 0 ? absorbedW / correctedVA : 1;
    const correctedCurrent = correctedVA / (Math.sqrt(3) * voltage);
    const designCurrent = capacitorCurrent * Math.max(values.designFactor, 1);
    const breaker = BREAKERS.find((item) => item >= designCurrent) ?? BREAKERS.at(-1)!;
    const correction = Math.max(values.temperatureFactor, 0.1) * Math.max(values.groupingFactor, 0.1);
    const cable = CABLE_TABLE.find(
      (item) => item[values.installationMethod] * correction >= breaker,
    );
    const cableAmpacity = cable ? cable[values.installationMethod] * correction : 0;
    const contactor = AC6B_CONTACTORS.find((item) => item.current >= capacitorCurrent);

    return {
      mechanicalW,
      absorbedW,
      apparentVA,
      phiDeg: (phi * 180) / Math.PI,
      tanPhi,
      reactiveVar,
      currentA,
      lossesW,
      targetTan,
      requiredKvar: Math.max(requiredKvar, 0),
      capacitorCurrent,
      remainingVar,
      correctedFp,
      correctedCurrent,
      designCurrent,
      breaker,
      cable,
      cableAmpacity,
      contactor,
    };
  }, [values]);

  const shortCalc = useMemo(() => calculateShortCircuit(shortValues), [shortValues]);

  const tabs: { id: TabId; label: string; number: string; icon: IconName }[] = [
    { id: "motor", label: "Motor trifásico", number: "01", icon: "bolt" },
    { id: "capacitor", label: "Correção do FP", number: "02", icon: "wave" },
    { id: "protecao", label: "Proteção e cabos", number: "03", icon: "shield" },
    { id: "curto", label: "Curto-circuito", number: "04", icon: "network" },
    { id: "memoria", label: "Memória de cálculo", number: "05", icon: "document" },
  ];

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Icon name="bolt" /></span>
          <div>
            <strong>Calculadora Elétrica</strong>
            <span>INDUSTRIAL</span>
          </div>
        </div>
        <div className="top-actions">
          <span className={`save-state ${saved ? "is-saved" : ""}`}>
            <i /> {saved ? "Salvo" : "Salvamento automático"}
          </span>
          {installPrompt && (
            <button className="install-button" onClick={installApp}><Icon name="install" /> Instalar</button>
          )}
          <button className="memory-button" onClick={() => setActiveTab("memoria")}><Icon name="document" /> Memória / PDF</button>
          <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label="Alternar tema">
            <Icon name={dark ? "sun" : "moon"} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="side-intro">
            <span>MEMÓRIA TÉCNICA</span>
            <h1>Cálculos claros, do dado à decisão.</h1>
            <p>Informe os dados, confira a fórmula aplicada e acompanhe cada resultado.</p>
          </div>
          <nav className="module-nav" aria-label="Módulos de cálculo">
            {tabs.map((tab) => (
              <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                <span className="nav-icon"><Icon name={tab.icon} /></span>
                <span><small>{tab.number}</small>{tab.label}</span>
                <b>›</b>
              </button>
            ))}
          </nav>
          <div className="safety-note">
            <Icon name="shield" />
            <p><strong>Pré-dimensionamento</strong>Confirme placa, instalação, curto-circuito e coordenação antes da execução.</p>
          </div>
        </aside>

        <div className="main-panel">
          {activeTab === "motor" && (
            <section className="calculator-section">
              <div className="section-heading">
                <div><span>MÓDULO 01</span><h2>Motor trifásico</h2><p>Corrente nominal e triângulo completo das potências.</p></div>
                <span className="section-badge">3Φ · 60 Hz</span>
              </div>
              <div className="calculator-grid">
                <div className="input-card">
                  <div className="card-title"><span>Dados de entrada</span><small>valores de placa</small></div>
                  <div className="fields-grid">
                    <Field label="Potência mecânica" value={values.cv} onChange={(v) => update("cv", v)} unit="cv" min={0} />
                    <Field label="Tensão de linha" value={values.voltage} onChange={(v) => update("voltage", v)} unit="V" min={1} />
                    <Field label="Fator de potência" value={values.powerFactor} onChange={(v) => update("powerFactor", v)} step="0.01" min={0.01} max={1} hint="cos φ" />
                    <Field label="Rendimento" value={values.efficiency} onChange={(v) => update("efficiency", v)} step="0.01" min={0.01} max={1} hint="η em valor decimal" />
                  </div>
                  <Formula title="Corrente nominal">Iₙ = (cv × 735,5) ÷ (√3 × V × FP × η)</Formula>
                  <div className="substitution">
                    Iₙ = ({format(values.cv, 1)} × 735,5) ÷ (1,732 × {format(values.voltage, 0)} × {format(values.powerFactor)} × {format(values.efficiency)})
                  </div>
                </div>
                <div className="results-area">
                  <div className="hero-result">
                    <span>Corrente nominal calculada</span>
                    <strong>{format(calc.currentA, 2)} <small>A</small></strong>
                    <p>Valor calculado em plena carga. A placa do motor prevalece para o ajuste definitivo.</p>
                  </div>
                  <div className="result-grid">
                    <ResultCard label="Potência no eixo" value={format(calc.mechanicalW / 1000)} unit="kW" />
                    <ResultCard label="Potência absorvida" value={format(calc.absorbedW / 1000)} unit="kW" accent="amber" />
                    <ResultCard label="Potência aparente" value={format(calc.apparentVA / 1000)} unit="kVA" accent="neutral" />
                    <ResultCard label="Potência reativa" value={format(calc.reactiveVar / 1000)} unit="kvar" accent="green" />
                  </div>
                  <div className="power-strip">
                    <div><span>φ</span><strong>{format(calc.phiDeg)}°</strong></div>
                    <div><span>tan φ</span><strong>{format(calc.tanPhi, 3)}</strong></div>
                    <div><span>Perdas</span><strong>{format(calc.lossesW / 1000)} kW</strong></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "capacitor" && (
            <section className="calculator-section">
              <div className="section-heading">
                <div><span>MÓDULO 02</span><h2>Correção do fator de potência</h2><p>Dimensionamento do banco e condição elétrica após a compensação.</p></div>
                <span className="section-badge">kvar</span>
              </div>
              <div className="calculator-grid">
                <div className="input-card">
                  <div className="card-title"><span>Meta de correção</span><small>FP atual {format(values.powerFactor)}</small></div>
                  <div className="fields-grid">
                    <Field label="FP desejado" value={values.targetPowerFactor} onChange={(v) => update("targetPowerFactor", v)} step="0.01" min={values.powerFactor} max={0.9999} />
                    <Field label="Banco comercial" value={values.selectedKvar} onChange={(v) => update("selectedKvar", v)} step="0.5" min={0} unit="kvar" />
                  </div>
                  <Formula title="Potência capacitiva necessária">Qc = P × [tan(arccos FP₁) − tan(arccos FP₂)]</Formula>
                  <div className="substitution">
                    Qc = {format(calc.absorbedW / 1000)} × ({format(calc.tanPhi, 3)} − {format(calc.targetTan, 3)}) = {format(calc.requiredKvar)} kvar
                  </div>
                  <div className="inline-alert amber-alert"><strong>Banco comercial adotado</strong><span>{format(values.selectedKvar)} kvar · {format(values.voltage, 0)} V</span></div>
                </div>
                <div className="results-area">
                  <div className="hero-result amber-hero">
                    <span>Banco calculado para a meta</span>
                    <strong>{format(calc.requiredKvar)} <small>kvar</small></strong>
                    <p>O valor comercial deve ser verificado também para cargas parciais, evitando sobrecompensação.</p>
                  </div>
                  <div className="result-grid">
                    <ResultCard label="FP resultante" value={format(calc.correctedFp, 3)} accent={calc.remainingVar < 0 ? "amber" : "green"} />
                    <ResultCard label="Corrente do capacitor" value={format(calc.capacitorCurrent)} unit="A" />
                    <ResultCard label="Corrente da rede corrigida" value={format(calc.correctedCurrent)} unit="A" accent="green" />
                    <ResultCard label="Reativo remanescente" value={format(Math.abs(calc.remainingVar) / 1000)} unit={calc.remainingVar < 0 ? "kvar cap." : "kvar ind."} accent="neutral" />
                  </div>
                  <div className="comparison-card">
                    <div className="comparison-head"><span>Antes</span><span>Depois</span></div>
                    <div className="compare-row"><span>Fator de potência</span><b>{format(values.powerFactor)}</b><i>→</i><strong>{format(calc.correctedFp, 3)}</strong></div>
                    <div className="compare-row"><span>Corrente de linha</span><b>{format(calc.currentA)} A</b><i>→</i><strong>{format(calc.correctedCurrent)} A</strong></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "protecao" && (
            <section className="calculator-section">
              <div className="section-heading">
                <div><span>MÓDULO 03</span><h2>Proteção e cabos do banco</h2><p>Disjuntor, seção preliminar e contator específico para capacitores.</p></div>
                <span className="section-badge">AC-6b</span>
              </div>
              <div className="calculator-grid">
                <div className="input-card">
                  <div className="card-title"><span>Critérios de projeto</span><small>banco {format(values.selectedKvar)} kvar</small></div>
                  <div className="fields-grid">
                    <Field label="Fator de dimensionamento" value={values.designFactor} onChange={(v) => update("designFactor", v)} step="0.05" min={1} hint="tolerância, tensão e harmônicas" />
                    <label className="field">
                      <span className="field-label">Método de instalação</span>
                      <span className="input-shell select-shell">
                        <select value={values.installationMethod} onChange={(e) => setValues((v) => ({ ...v, installationMethod: e.target.value as "B1" | "B2" }))}>
                          <option value="B1">B1 · unipolar em eletroduto</option>
                          <option value="B2">B2 · multipolar em eletroduto</option>
                        </select>
                      </span>
                    </label>
                    <Field label="Fator de temperatura" value={values.temperatureFactor} onChange={(v) => update("temperatureFactor", v)} step="0.01" min={0.1} max={1} />
                    <Field label="Fator de agrupamento" value={values.groupingFactor} onChange={(v) => update("groupingFactor", v)} step="0.01" min={0.1} max={1} />
                  </div>
                  <Formula title="Corrente de projeto">Iproj = {format(values.designFactor)} × Qc ÷ (√3 × V)</Formula>
                  <div className="substitution">Iproj = {format(values.designFactor)} × {format(calc.capacitorCurrent)} = {format(calc.designCurrent)} A</div>
                </div>
                <div className="results-area">
                  <div className="selection-grid">
                    <article className="selection-card"><span className="selection-icon"><Icon name="shield" /></span><div><small>DISJUNTOR TRIPOLAR</small><strong>{format(calc.breaker, 0)} A</strong><p>Curva/ajuste compatível com a energização capacitiva.</p></div></article>
                    <article className="selection-card"><span className="selection-icon cable-icon">㎟</span><div><small>CABO DE COBRE PVC 70 °C</small><strong>{calc.cable ? format(calc.cable.section, calc.cable.section % 1 ? 1 : 0) : "—"} mm²</strong><p>{calc.cable ? `Iz corrigida: ${format(calc.cableAmpacity)} A` : "Tabela insuficiente para esta corrente."}</p></div></article>
                    <article className="selection-card full-selection"><span className="selection-icon"><Icon name="wave" /></span><div><small>CONTATOR PARA CAPACITORES</small><strong>{calc.contactor?.model ?? "Consultar fabricante"} · AC-6b</strong><p>{calc.contactor ? `${format(calc.contactor.current, 0)} A em AC-6b, referência de seleção até 55 °C.` : "Selecione pela potência em kvar e temperatura do fabricante."}</p></div></article>
                  </div>
                  <div className="coordination-check">
                    <div className="coordination-line"><span>Iproj</span><b>{format(calc.designCurrent)} A</b></div><i>≤</i>
                    <div className="coordination-line"><span>In disjuntor</span><b>{format(calc.breaker, 0)} A</b></div><i>≤</i>
                    <div className="coordination-line"><span>Iz cabo</span><b>{format(calc.cableAmpacity)} A</b></div>
                  </div>
                  <div className={`inline-alert ${calc.cableAmpacity >= calc.breaker ? "green-alert" : "red-alert"}`}>
                    <strong>{calc.cableAmpacity >= calc.breaker ? "Coordenação térmica atendida" : "Coordenação não atendida"}</strong>
                    <span>Verifique queda de tensão, curto-circuito, ambiente e agrupamento no projeto definitivo.</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "curto" && (
            <ShortCircuitModule values={shortValues} onChange={setShortValues} calc={shortCalc} />
          )}

          {activeTab === "memoria" && (
            <ReportModule
              identity={identity}
              onIdentityChange={setIdentity}
              coreValues={values}
              coreCalc={calc}
              shortValues={shortValues}
              shortCalc={shortCalc}
            />
          )}
        </div>
      </section>

      <footer className="app-footer"><span>Calculadora Elétrica Industrial</span><p>Resultados de apoio ao projeto · confirme normas, catálogos e dados de campo.</p></footer>
    </main>
  );
}
