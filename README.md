# Calculadora Elétrica Industrial

Aplicação web responsiva para cálculos elétricos industriais, com apresentação das fórmulas, substituição dos valores e geração de memória de cálculo organizada.

## Recursos

- corrente nominal e potências do motor trifásico;
- potência ativa absorvida, aparente e reativa;
- correção do fator de potência e banco de capacitores;
- dimensionamento preliminar do disjuntor, cabo e contator AC-6b;
- corrente de curto-circuito trifásico em três pontos;
- memória de cálculo para impressão ou PDF;
- exportação em TXT e salvamento do projeto em JSON;
- funcionamento responsivo e instalação como PWA.

## Executar no computador

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev:vercel
```

Abra `http://localhost:3000` no navegador.

## Publicar na Vercel

1. Envie este projeto para um repositório no GitHub.
2. Na Vercel, escolha **Add New > Project** e importe o repositório.
3. Mantenha o framework **Next.js** e as configurações detectadas automaticamente.
4. Clique em **Deploy**.

O arquivo `vercel.json` seleciona automaticamente a compilação compatível com a Vercel.

Opcionalmente, defina `NEXT_PUBLIC_SITE_URL` com o domínio definitivo, incluindo `https://`, para manter os metadados de compartilhamento apontando para o endereço oficial.

## Comandos

```bash
npm run dev:vercel       # desenvolvimento local com Next.js
npm run build:vercel     # compilação para Vercel
npm run start:vercel     # executa a compilação da Vercel
npm run dev              # desenvolvimento no ambiente Sites/Vinext
npm run build            # compilação no ambiente Sites/Vinext
```

## Responsabilidade técnica

Os resultados são auxiliares de projeto. O dimensionamento final deve considerar os dados reais da instalação, capacidade de interrupção, método de instalação, fatores de correção, coordenação e seletividade, normas aplicáveis e documentação dos fabricantes.
