"use client";

import { useState } from "react";

export type Material = "copper" | "aluminum";

export type ShortCircuitInput = {
  transformerKva: number;
  voltage: number;
  impedancePercent: number;
  copperLossW: number;
  cmax: number;
  reactanceMilliOhmPerM: number;
  segment1Length: number;
  segment1Section: number;
  segment1Parallel: number;
  segment1Material: Material;
  segment2Length: number;
  segment2Section: number;
  segment2Parallel: number;
  segment2Material: Material;
};

export type IdentityInput = {
  projectName: string;
  client: string;
  location: string;
  responsible: string;
  date: string;
};

export const SHORT_INITIAL: ShortCircuitInput = {
  transformerKva: 300,
  voltage: 220,
  impedancePercent: 4.5,
  copperLossW: 0,
  cmax: 1.1,
  reactanceMilliOhmPerM: 0.08,
  segment1Length: 20,
  segment1Section: 240,
  segment1Parallel: 2,
  segment1Material: "copper",
  segment2Length: 30,
  segment2Section: 25,
  segment2Parallel: 1,
  segment2Material: "copper",
};

export const IDENTITY_INITIAL: IdentityInput = {
  projectName: "Acionamento industrial — motor 25 cv",
  client: "",
  location: "Rio Branco — AC",
  responsible: "Joelson M. Mendes — Esp. em Energia e IoT",
  date: new Date().toISOString().slice(0, 10),
};

const BREAKING_CAPACITIES = [3, 4.5, 6, 10, 15, 25, 36, 50, 70, 100, 150];

const safe = (value: number, fallback = 0.000001) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const nextBreakingCapacity = (currentKa: number, margin = 1) =>
  BREAKING_CAPACITIES.find((item) => item >= currentKa * margin) ?? BREAKING_CAPACITIES.at(-1)!;

export type ShortPoint = {
  resistance: number;
  reactance: number;
  impedance: number;
  nominalA: number;
  maximumA: number;
  minimumIcu: number;
  recommendedIcu: number;
};

export type ShortCircuitCalc = {
  transformerNominalA: number;
  transformerZ: number;
  transformerR: number;
  transformerX: number;
  segment1R: number;
  segment1X: number;
  segment2R: number;
  segment2X: number;
  point1: ShortPoint;
  point2: ShortPoint;
  point3: ShortPoint;
};

export function calculateShortCircuit(values: ShortCircuitInput): ShortCircuitCalc {
  const voltage = safe(values.voltage);
  const transformerVA = safe(values.transformerKva) * 1000;
  const transformerNominalA = transformerVA / (Math.sqrt(3) * voltage);
  const transformerZ = (voltage ** 2 / transformerVA) * (safe(values.impedancePercent) / 100);
  const calculatedR = values.copperLossW > 0
    ? values.copperLossW / (3 * transformerNominalA ** 2)
    : 0;
  const transformerR = Math.min(calculatedR, transformerZ);
  const transformerX = Math.sqrt(Math.max(transformerZ ** 2 - transformerR ** 2, 0));
  const rho1 = values.segment1Material === "copper" ? 0.01851 : 0.02941;
  const rho2 = values.segment2Material === "copper" ? 0.01851 : 0.02941;
  const segment1R =
    (rho1 * Math.max(values.segment1Length, 0)) /
    (safe(values.segment1Section) * safe(values.segment1Parallel, 1));
  const segment2R =
    (rho2 * Math.max(values.segment2Length, 0)) /
    (safe(values.segment2Section) * safe(values.segment2Parallel, 1));
  const segment1X =
    (Math.max(values.reactanceMilliOhmPerM, 0) / 1000) * Math.max(values.segment1Length, 0);
  const segment2X =
    (Math.max(values.reactanceMilliOhmPerM, 0) / 1000) * Math.max(values.segment2Length, 0);

  const point = (resistance: number, reactance: number): ShortPoint => {
    const impedance = Math.hypot(resistance, reactance);
    const nominalA = voltage / (Math.sqrt(3) * safe(impedance));
    const maximumA = Math.max(values.cmax, 0.1) * nominalA;
    const ka = maximumA / 1000;
    return {
      resistance,
      reactance,
      impedance,
      nominalA,
      maximumA,
      minimumIcu: nextBreakingCapacity(ka),
      recommendedIcu: nextBreakingCapacity(ka, 1.2),
    };
  };

  return {
    transformerNominalA,
    transformerZ,
    transformerR,
    transformerX,
    segment1R,
    segment1X,
    segment2R,
    segment2X,
    point1: point(transformerR, transformerX),
    point2: point(transformerR + segment1R, transformerX + segment1X),
    point3: point(
      transformerR + segment1R + segment2R,
      transformerX + segment1X + segment2X,
    ),
  };
}

const nf = (value: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);

function NumberField({
  label,
  value,
  onChange,
  unit,
  step = "any",
  min = 0,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: string;
  min?: number;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function MaterialField({
  value,
  onChange,
}: {
  value: Material;
  onChange: (value: Material) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">Material</span>
      <span className="input-shell select-shell">
        <select value={value} onChange={(event) => onChange(event.target.value as Material)}>
          <option value="copper">Cobre</option>
          <option value="aluminum">Alumínio</option>
        </select>
      </span>
    </label>
  );
}

function ShortResult({
  number,
  title,
  subtitle,
  point,
}: {
  number: string;
  title: string;
  subtitle: string;
  point: ShortPoint;
}) {
  return (
    <article className="short-result-card">
      <div className="short-result-head">
        <span>{number}</span>
        <div><strong>{title}</strong><small>{subtitle}</small></div>
      </div>
      <div className="short-current"><strong>{nf(point.maximumA / 1000)}</strong><span>kA</span></div>
      <dl>
        <div><dt>Icc nominal</dt><dd>{nf(point.nominalA / 1000)} kA</dd></div>
        <div><dt>Impedância total</dt><dd>{nf(point.impedance * 1000, 3)} mΩ</dd></div>
        <div><dt>Icu mínimo</dt><dd>{nf(point.minimumIcu, point.minimumIcu % 1 ? 1 : 0)} kA</dd></div>
        <div><dt>Icu recomendado</dt><dd>{nf(point.recommendedIcu, point.recommendedIcu % 1 ? 1 : 0)} kA</dd></div>
      </dl>
    </article>
  );
}

export function ShortCircuitModule({
  values,
  onChange,
  calc,
}: {
  values: ShortCircuitInput;
  onChange: (next: ShortCircuitInput) => void;
  calc: ShortCircuitCalc;
}) {
  const update = <K extends keyof ShortCircuitInput>(key: K, value: ShortCircuitInput[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <section className="calculator-section">
      <div className="section-heading">
        <div>
          <span>MÓDULO 04</span>
          <h2>Curto-circuito em três pontos</h2>
          <p>Composição vetorial das impedâncias da fonte e dos dois alimentadores.</p>
        </div>
        <span className="section-badge">IEC 60909</span>
      </div>

      <div className="short-input-layout">
        <article className="input-card transformer-card">
          <div className="card-title"><span>Fonte — transformador</span><small>secundário trifásico</small></div>
          <div className="fields-grid short-fields">
            <NumberField label="Potência" value={values.transformerKva} onChange={(v) => update("transformerKva", v)} unit="kVA" />
            <NumberField label="Tensão secundária" value={values.voltage} onChange={(v) => update("voltage", v)} unit="V" />
            <NumberField label="Impedância" value={values.impedancePercent} onChange={(v) => update("impedancePercent", v)} unit="%" step="0.1" />
            <NumberField label="Perdas em carga Pcu" value={values.copperLossW} onChange={(v) => update("copperLossW", v)} unit="W" hint="0 = resistência do trafo desprezada" />
            <NumberField label="Fator de tensão cmax" value={values.cmax} onChange={(v) => update("cmax", v)} step="0.01" />
            <NumberField label="Reatância dos cabos" value={values.reactanceMilliOhmPerM} onChange={(v) => update("reactanceMilliOhmPerM", v)} unit="mΩ/m" step="0.01" />
          </div>
          <div className="formula-box compact-formula">
            <span>Impedância da fonte</span>
            <code>Zt = (V² ÷ Sn) × (Z% ÷ 100)</code>
          </div>
          <div className="substitution">
            Zt = ({nf(values.voltage, 0)}² ÷ {nf(values.transformerKva * 1000, 0)}) × {nf(values.impedancePercent)}% = {nf(calc.transformerZ * 1000, 3)} mΩ
          </div>
        </article>

        <article className="input-card cable-entry-card">
          <div className="card-title"><span>Trecho 1</span><small>fonte → quadro geral</small></div>
          <div className="fields-grid short-fields">
            <NumberField label="Comprimento" value={values.segment1Length} onChange={(v) => update("segment1Length", v)} unit="m" />
            <NumberField label="Seção por cabo" value={values.segment1Section} onChange={(v) => update("segment1Section", v)} unit="mm²" />
            <NumberField label="Cabos em paralelo/fase" value={values.segment1Parallel} onChange={(v) => update("segment1Parallel", v)} unit="un" step="1" min={1} />
            <MaterialField value={values.segment1Material} onChange={(v) => update("segment1Material", v)} />
          </div>
          <div className="cable-impedance-row"><span>R₁</span><strong>{nf(calc.segment1R * 1000, 3)} mΩ</strong><span>X₁</span><strong>{nf(calc.segment1X * 1000, 3)} mΩ</strong></div>
        </article>

        <article className="input-card cable-entry-card">
          <div className="card-title"><span>Trecho 2</span><small>quadro geral → quadro do circuito</small></div>
          <div className="fields-grid short-fields">
            <NumberField label="Comprimento" value={values.segment2Length} onChange={(v) => update("segment2Length", v)} unit="m" />
            <NumberField label="Seção por cabo" value={values.segment2Section} onChange={(v) => update("segment2Section", v)} unit="mm²" />
            <NumberField label="Cabos em paralelo/fase" value={values.segment2Parallel} onChange={(v) => update("segment2Parallel", v)} unit="un" step="1" min={1} />
            <MaterialField value={values.segment2Material} onChange={(v) => update("segment2Material", v)} />
          </div>
          <div className="cable-impedance-row"><span>R₂</span><strong>{nf(calc.segment2R * 1000, 3)} mΩ</strong><span>X₂</span><strong>{nf(calc.segment2X * 1000, 3)} mΩ</strong></div>
        </article>
      </div>

      <div className="fault-path" aria-label="Percurso dos três pontos de curto-circuito">
        <div><i>01</i><strong>Fonte</strong><span>{nf(calc.point1.maximumA / 1000)} kA</span></div>
        <b><small>{nf(values.segment1Length, 0)} m</small>→</b>
        <div><i>02</i><strong>Quadro geral</strong><span>{nf(calc.point2.maximumA / 1000)} kA</span></div>
        <b><small>{nf(values.segment2Length, 0)} m</small>→</b>
        <div><i>03</i><strong>Quadro do circuito</strong><span>{nf(calc.point3.maximumA / 1000)} kA</span></div>
      </div>

      <div className="short-results-grid">
        <ShortResult number="01" title="Terminais da fonte" subtitle="distância acumulada: 0 m" point={calc.point1} />
        <ShortResult number="02" title="Quadro geral" subtitle={`distância acumulada: ${nf(values.segment1Length, 0)} m`} point={calc.point2} />
        <ShortResult number="03" title="Quadro do circuito" subtitle={`distância acumulada: ${nf(values.segment1Length + values.segment2Length, 0)} m`} point={calc.point3} />
      </div>

      <div className="short-formula-summary">
        <div className="formula-box"><span>Resistência do cabo</span><code>Rc = ρ × L ÷ (S × n)</code></div>
        <div className="formula-box"><span>Impedância acumulada</span><code>|Z| = √(ΣR² + ΣX²)</code></div>
        <div className="formula-box"><span>Curto-circuito máximo</span><code>I″k = cmax × V ÷ (√3 × |Z|)</code></div>
      </div>

      <div className="inline-alert amber-alert short-warning">
        <strong>Hipótese conservadora</strong>
        <span>Sem Pcu, considera-se Rt ≈ 0 e Xt ≈ Zt. A rede de MT e contribuições de motores não estão incluídas; informe os dados reais para o estudo definitivo.</span>
      </div>
    </section>
  );
}

type CoreValues = {
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

type CoreCalc = {
  mechanicalW: number;
  absorbedW: number;
  apparentVA: number;
  phiDeg: number;
  tanPhi: number;
  reactiveVar: number;
  currentA: number;
  lossesW: number;
  targetTan: number;
  requiredKvar: number;
  capacitorCurrent: number;
  remainingVar: number;
  correctedFp: number;
  correctedCurrent: number;
  designCurrent: number;
  breaker: number;
  cable?: { section: number; B1: number; B2: number };
  cableAmpacity: number;
  contactor?: { model: string; current: number };
};

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell"><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></span>
    </label>
  );
}

function ReportFormula({ title, formula, substitution, result }: { title: string; formula: string; substitution: string; result: string }) {
  return (
    <div className="report-formula">
      <strong>{title}</strong>
      <code>{formula}</code>
      <span>{substitution}</span>
      <b>{result}</b>
    </div>
  );
}

function buildReportText(
  identity: IdentityInput,
  core: CoreValues,
  motor: CoreCalc,
  shortInput: ShortCircuitInput,
  short: ShortCircuitCalc,
) {
  return `MEMÓRIA DE CÁLCULO — INSTALAÇÃO ELÉTRICA INDUSTRIAL

Projeto: ${identity.projectName}
Cliente: ${identity.client || "Não informado"}
Local: ${identity.location || "Não informado"}
Responsável: ${identity.responsible || "Não informado"}
Data: ${identity.date}

1. MOTOR TRIFÁSICO
Dados: ${nf(core.cv)} cv; ${nf(core.voltage, 0)} V; FP ${nf(core.powerFactor)}; rendimento ${nf(core.efficiency)}.
P mecânica = ${nf(core.cv)} × 735,5 = ${nf(motor.mechanicalW / 1000)} kW.
P absorvida = ${nf(motor.mechanicalW / 1000)} ÷ ${nf(core.efficiency)} = ${nf(motor.absorbedW / 1000)} kW.
I nominal = Pabs ÷ (√3 × V × FP) = ${nf(motor.currentA)} A.
S = P ÷ FP = ${nf(motor.apparentVA / 1000)} kVA.
Q = P × tan(arccos FP) = ${nf(motor.reactiveVar / 1000)} kvar.
Perdas = ${nf(motor.lossesW / 1000)} kW.

2. CORREÇÃO DO FATOR DE POTÊNCIA
FP inicial: ${nf(core.powerFactor)}. FP desejado: ${nf(core.targetPowerFactor)}.
Qc = P × [tan(arccos FP1) − tan(arccos FP2)] = ${nf(motor.requiredKvar)} kvar.
Banco comercial adotado: ${nf(core.selectedKvar)} kvar em ${nf(core.voltage, 0)} V.
Corrente do capacitor: ${nf(motor.capacitorCurrent)} A.
FP resultante em plena carga: ${nf(motor.correctedFp, 3)}.
Corrente da rede após correção: ${nf(motor.correctedCurrent)} A.

3. PROTEÇÃO DO BANCO
Corrente de projeto = ${nf(core.designFactor)} × ${nf(motor.capacitorCurrent)} = ${nf(motor.designCurrent)} A.
Disjuntor tripolar selecionado: ${nf(motor.breaker, 0)} A.
Cabo preliminar: ${motor.cable ? nf(motor.cable.section, motor.cable.section % 1 ? 1 : 0) : "—"} mm² Cu/PVC, método ${core.installationMethod}; Iz corrigida ${nf(motor.cableAmpacity)} A.
Contator: ${motor.contactor?.model ?? "consultar fabricante"}, categoria AC-6b.

4. CURTO-CIRCUITO TRIFÁSICO
Fonte: ${nf(shortInput.transformerKva, 0)} kVA; ${nf(shortInput.voltage, 0)} V; Z ${nf(shortInput.impedancePercent)}%; cmax ${nf(shortInput.cmax)}.
Zt = ${nf(short.transformerZ * 1000, 3)} mΩ.
Ponto 1 — fonte: Icc nominal ${nf(short.point1.nominalA / 1000)} kA; Icc máxima ${nf(short.point1.maximumA / 1000)} kA; Icu recomendado ${nf(short.point1.recommendedIcu)} kA.
Ponto 2 — quadro geral após ${nf(shortInput.segment1Length, 0)} m: Icc nominal ${nf(short.point2.nominalA / 1000)} kA; Icc máxima ${nf(short.point2.maximumA / 1000)} kA; Icu recomendado ${nf(short.point2.recommendedIcu)} kA.
Ponto 3 — quadro do circuito após ${nf(shortInput.segment1Length + shortInput.segment2Length, 0)} m: Icc nominal ${nf(short.point3.nominalA / 1000)} kA; Icc máxima ${nf(short.point3.maximumA / 1000)} kA; Icu recomendado ${nf(short.point3.recommendedIcu)} kA.

5. OBSERVAÇÕES
Este documento constitui pré-dimensionamento. Confirmar dados de placa, impedância da rede, perdas do transformador, temperatura, agrupamento, queda de tensão, suportabilidade térmica, contribuição de motores, seletividade e tabelas dos fabricantes antes da execução.
`;
}

export function ReportModule({
  identity,
  onIdentityChange,
  coreValues,
  coreCalc,
  shortValues,
  shortCalc,
}: {
  identity: IdentityInput;
  onIdentityChange: (next: IdentityInput) => void;
  coreValues: CoreValues;
  coreCalc: CoreCalc;
  shortValues: ShortCircuitInput;
  shortCalc: ShortCircuitCalc;
}) {
  const [feedback, setFeedback] = useState("");
  const updateIdentity = (key: keyof IdentityInput, value: string) => onIdentityChange({ ...identity, [key]: value });
  const reportText = () => buildReportText(identity, coreValues, coreCalc, shortValues, shortCalc);
  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 1800);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(reportText());
    notify("Memória copiada");
  };
  const download = (content: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="calculator-section report-module">
      <div className="section-heading report-page-heading">
        <div><span>MÓDULO 05</span><h2>Memória de cálculo</h2><p>Documento técnico completo, organizado e pronto para impressão ou PDF.</p></div>
        <span className="section-badge">A4 · PDF</span>
      </div>

      <div className="report-controls no-print">
        <div className="identity-fields">
          <TextField label="Projeto" value={identity.projectName} onChange={(v) => updateIdentity("projectName", v)} />
          <TextField label="Cliente" value={identity.client} onChange={(v) => updateIdentity("client", v)} />
          <TextField label="Local" value={identity.location} onChange={(v) => updateIdentity("location", v)} />
          <TextField label="Responsável técnico" value={identity.responsible} onChange={(v) => updateIdentity("responsible", v)} />
          <TextField label="Data" value={identity.date} onChange={(v) => updateIdentity("date", v)} type="date" />
        </div>
        <div className="report-actions">
          <button className="primary-action" onClick={() => window.print()}>Imprimir / gerar PDF</button>
          <button onClick={copy}>Copiar texto</button>
          <button onClick={() => download(reportText(), "memoria-calculo-eletrico.txt", "text/plain;charset=utf-8")}>Baixar .TXT</button>
          <button onClick={() => download(JSON.stringify({ identity, coreValues, shortValues }, null, 2), "projeto-calculadora-eletrica.json", "application/json")}>Salvar projeto</button>
          {feedback && <span>{feedback}</span>}
        </div>
      </div>

      <article className="report-paper" id="memoria-calculo">
        <header className="report-header">
          <div className="report-brand-mark">ϟ</div>
          <div><span>MEMÓRIA TÉCNICA</span><h1>Memória de cálculo elétrico industrial</h1><p>Motor · fator de potência · banco de capacitores · proteção · curto-circuito</p></div>
          <aside><small>REVISÃO</small><strong>R00</strong></aside>
        </header>

        <section className="report-identification">
          <div><small>PROJETO</small><strong>{identity.projectName || "Não informado"}</strong></div>
          <div><small>CLIENTE</small><strong>{identity.client || "Não informado"}</strong></div>
          <div><small>LOCAL</small><strong>{identity.location || "Não informado"}</strong></div>
          <div><small>RESPONSÁVEL</small><strong>{identity.responsible || "Não informado"}</strong></div>
          <div><small>DATA</small><strong>{identity.date ? new Date(`${identity.date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</strong></div>
        </section>

        <section className="report-section">
          <div className="report-section-title"><b>01</b><div><span>MOTOR TRIFÁSICO</span><small>Corrente nominal e potências</small></div></div>
          <table className="report-data-table"><tbody>
            <tr><th>Potência mecânica</th><td>{nf(coreValues.cv)} cv</td><th>Tensão de linha</th><td>{nf(coreValues.voltage, 0)} V</td></tr>
            <tr><th>Fator de potência</th><td>{nf(coreValues.powerFactor)}</td><th>Rendimento</th><td>{nf(coreValues.efficiency)}</td></tr>
          </tbody></table>
          <div className="report-formula-grid">
            <ReportFormula title="Potência mecânica" formula="Pmec = cv × 735,5" substitution={`${nf(coreValues.cv)} × 735,5`} result={`${nf(coreCalc.mechanicalW / 1000)} kW`} />
            <ReportFormula title="Potência absorvida" formula="Pabs = Pmec ÷ η" substitution={`${nf(coreCalc.mechanicalW / 1000)} ÷ ${nf(coreValues.efficiency)}`} result={`${nf(coreCalc.absorbedW / 1000)} kW`} />
            <ReportFormula title="Corrente nominal" formula="In = Pabs ÷ (√3 × V × FP)" substitution={`${nf(coreCalc.absorbedW, 0)} ÷ (1,732 × ${nf(coreValues.voltage, 0)} × ${nf(coreValues.powerFactor)})`} result={`${nf(coreCalc.currentA)} A`} />
            <ReportFormula title="Potência reativa" formula="Q = P × tan(arccos FP)" substitution={`${nf(coreCalc.absorbedW / 1000)} × ${nf(coreCalc.tanPhi, 3)}`} result={`${nf(coreCalc.reactiveVar / 1000)} kvar`} />
          </div>
          <div className="report-result-band"><span>Potência aparente <b>{nf(coreCalc.apparentVA / 1000)} kVA</b></span><span>Ângulo φ <b>{nf(coreCalc.phiDeg)}°</b></span><span>Perdas <b>{nf(coreCalc.lossesW / 1000)} kW</b></span></div>
        </section>

        <section className="report-section">
          <div className="report-section-title"><b>02</b><div><span>CORREÇÃO DO FATOR DE POTÊNCIA</span><small>Dimensionamento do banco capacitivo</small></div></div>
          <ReportFormula title="Potência capacitiva necessária" formula="Qc = P × [tan(arccos FP₁) − tan(arccos FP₂)]" substitution={`${nf(coreCalc.absorbedW / 1000)} × (${nf(coreCalc.tanPhi, 3)} − ${nf(coreCalc.targetTan, 3)})`} result={`${nf(coreCalc.requiredKvar)} kvar`} />
          <table className="report-summary-table"><thead><tr><th>Parâmetro</th><th>Antes</th><th>Depois</th></tr></thead><tbody>
            <tr><td>Fator de potência</td><td>{nf(coreValues.powerFactor)}</td><td>{nf(coreCalc.correctedFp, 3)}</td></tr>
            <tr><td>Corrente da rede</td><td>{nf(coreCalc.currentA)} A</td><td>{nf(coreCalc.correctedCurrent)} A</td></tr>
            <tr><td>Potência reativa</td><td>{nf(coreCalc.reactiveVar / 1000)} kvar ind.</td><td>{nf(Math.abs(coreCalc.remainingVar) / 1000)} kvar {coreCalc.remainingVar < 0 ? "cap." : "ind."}</td></tr>
          </tbody></table>
          <p className="report-conclusion">Banco comercial adotado: <strong>{nf(coreValues.selectedKvar)} kvar — {nf(coreValues.voltage, 0)} V</strong>. Corrente nominal do banco: <strong>{nf(coreCalc.capacitorCurrent)} A</strong>.</p>
        </section>

        <section className="report-section">
          <div className="report-section-title"><b>03</b><div><span>PROTEÇÃO E CONDUTORES DO BANCO</span><small>Pré-dimensionamento e coordenação</small></div></div>
          <ReportFormula title="Corrente de projeto" formula="Iproj = fator × Ic" substitution={`${nf(coreValues.designFactor)} × ${nf(coreCalc.capacitorCurrent)}`} result={`${nf(coreCalc.designCurrent)} A`} />
          <div className="report-selection-row">
            <div><small>DISJUNTOR</small><strong>3P · {nf(coreCalc.breaker, 0)} A</strong><span>Icu conforme ponto de instalação</span></div>
            <div><small>CABO PRELIMINAR</small><strong>{coreCalc.cable ? nf(coreCalc.cable.section, coreCalc.cable.section % 1 ? 1 : 0) : "—"} mm² Cu/PVC</strong><span>Iz corrigida: {nf(coreCalc.cableAmpacity)} A</span></div>
            <div><small>CONTATOR</small><strong>{coreCalc.contactor?.model ?? "Consultar"} · AC-6b</strong><span>Com resistores de pré-carga</span></div>
          </div>
          <p className="report-equation-line">Iproj = {nf(coreCalc.designCurrent)} A ≤ In disjuntor = {nf(coreCalc.breaker, 0)} A ≤ Iz cabo = {nf(coreCalc.cableAmpacity)} A</p>
        </section>

        <section className="report-section page-break-avoid">
          <div className="report-section-title"><b>04</b><div><span>CURTO-CIRCUITO TRIFÁSICO</span><small>Corrente inicial simétrica em três pontos</small></div></div>
          <table className="report-data-table"><tbody>
            <tr><th>Transformador</th><td>{nf(shortValues.transformerKva, 0)} kVA</td><th>Tensão</th><td>{nf(shortValues.voltage, 0)} V</td></tr>
            <tr><th>Impedância</th><td>{nf(shortValues.impedancePercent)}%</td><th>Fator cmax</th><td>{nf(shortValues.cmax)}</td></tr>
            <tr><th>Trecho 1</th><td>{nf(shortValues.segment1Length, 0)} m · {shortValues.segment1Parallel} × {nf(shortValues.segment1Section, 0)} mm²</td><th>Trecho 2</th><td>{nf(shortValues.segment2Length, 0)} m · {shortValues.segment2Parallel} × {nf(shortValues.segment2Section, 0)} mm²</td></tr>
          </tbody></table>
          <ReportFormula title="Impedância do transformador" formula="Zt = (V² ÷ Sn) × (Z% ÷ 100)" substitution={`(${nf(shortValues.voltage, 0)}² ÷ ${nf(shortValues.transformerKva * 1000, 0)}) × ${nf(shortValues.impedancePercent / 100, 3)}`} result={`${nf(shortCalc.transformerZ * 1000, 3)} mΩ`} />
          <table className="report-summary-table"><thead><tr><th>Ponto</th><th>R total</th><th>X total</th><th>Icc nominal</th><th>Icc máxima</th><th>Icu recomendado</th></tr></thead><tbody>
            <tr><td>01 · Fonte</td><td>{nf(shortCalc.point1.resistance * 1000, 3)} mΩ</td><td>{nf(shortCalc.point1.reactance * 1000, 3)} mΩ</td><td>{nf(shortCalc.point1.nominalA / 1000)} kA</td><td>{nf(shortCalc.point1.maximumA / 1000)} kA</td><td>{nf(shortCalc.point1.recommendedIcu)} kA</td></tr>
            <tr><td>02 · Quadro geral</td><td>{nf(shortCalc.point2.resistance * 1000, 3)} mΩ</td><td>{nf(shortCalc.point2.reactance * 1000, 3)} mΩ</td><td>{nf(shortCalc.point2.nominalA / 1000)} kA</td><td>{nf(shortCalc.point2.maximumA / 1000)} kA</td><td>{nf(shortCalc.point2.recommendedIcu)} kA</td></tr>
            <tr><td>03 · Quadro do circuito</td><td>{nf(shortCalc.point3.resistance * 1000, 3)} mΩ</td><td>{nf(shortCalc.point3.reactance * 1000, 3)} mΩ</td><td>{nf(shortCalc.point3.nominalA / 1000)} kA</td><td>{nf(shortCalc.point3.maximumA / 1000)} kA</td><td>{nf(shortCalc.point3.recommendedIcu)} kA</td></tr>
          </tbody></table>
          <ReportFormula title="Corrente máxima no ponto 3" formula="I″k = cmax × V ÷ (√3 × |Z|)" substitution={`${nf(shortValues.cmax)} × ${nf(shortValues.voltage, 0)} ÷ (1,732 × ${nf(shortCalc.point3.impedance, 6)})`} result={`${nf(shortCalc.point3.maximumA / 1000)} kA`} />
        </section>

        <section className="report-section report-notes">
          <div className="report-section-title"><b>05</b><div><span>PREMISSAS E RECOMENDAÇÕES</span><small>Limites de aplicação desta memória</small></div></div>
          <ul>
            <li>Os resultados são de pré-dimensionamento e devem ser confirmados com dados de placa e catálogos.</li>
            <li>Confirmar temperatura, agrupamento, método de instalação, queda de tensão e suportabilidade térmica ao curto-circuito.</li>
            <li>O contator do banco deve ser categoria AC-6b, com pré-carga, e intertravado com o motor.</li>
            <li>Acrescentar impedância da rede de MT, contribuição de motores e estudo de seletividade no projeto executivo.</li>
            <li>Não instalar capacitores na saída de inversores de frequência.</li>
          </ul>
        </section>

        <footer className="report-footer">
          <div><span>Elaborado por</span><strong>{identity.responsible || "Responsável técnico"}</strong></div>
          <p>Documento gerado pela Calculadora Elétrica Industrial</p>
        </footer>
      </article>
    </section>
  );
}
