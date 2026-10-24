# Derivé

**Perca-se na cidade, encontre-se no café.**

O Derivé sorteia um café na sua cidade pra você ir a pé, flanando no caminho. Você marca onde já foi, diz se voltaria, e o app passa a sugerir só lugares novos.

## O que tem

- **Hoje:** escolha a cidade (ou use sua localização), ajuste os filtros e toque em *Sortear café*.
- **Modo surpresa:** só a direção e o tempo de caminhada. O nome do café aparece quando você chega a menos de 100 m.
- **Derivar em grupo:** cada pessoa manda o próprio link, e o sorteio só escolhe cafés onde ninguém do grupo foi.
- **Meus cafés:** lista de onde você já foi, "voltaria / não voltaria" e o mapa dos bairros que você já conhece.
- **Flanar:** o conceito por trás do app.

Tudo que você marca fica salvo só no navegador (localStorage). Não há servidor nem login.

## Rodar

É um site estático: `index.html`, `styles.css`, `app.js` e `config.js`. Basta abrir o `index.html` ou publicar a pasta em qualquer hospedagem estática.

Sem chave do Google, o site abre em **modo demonstração**, com cafés de exemplo.

## Publicar no GitHub Pages

1. Suba estes arquivos para um repositório (por exemplo `derive`).
2. No repositório, vá em **Settings → Pages**.
3. Em *Source*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
4. Em um ou dois minutos o site fica em `https://SEU-USUARIO.github.io/derive/`.

## Ligar os cafés reais (Google)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto.
2. Ative a cobrança no projeto (o Google exige, mesmo com a cota gratuita mensal).
3. Em **APIs e serviços → Biblioteca**, ative:
   - **Maps JavaScript API**
   - **Places API (New)**
   - **Geocoding API** (usada só no botão "Usar minha localização")
4. Em **APIs e serviços → Credenciais**, crie uma **chave de API**.
5. Restrinja a chave:
   - *Restrições de aplicativo:* **Sites (referenciadores HTTP)** → adicione `https://SEU-USUARIO.github.io/*`
   - *Restrições de API:* só as três APIs acima.
6. Em **APIs e serviços → Cotas**, defina um limite diário de requisições pra Places API, pra nunca ter conta surpresa.
7. Cole a chave em `config.js`, no campo `GOOGLE_MAPS_API_KEY`, e suba o arquivo de novo.

Com a restrição de site, a chave fica visível no código mas só funciona no seu endereço.

### Sobre custos

Cada vez que você abre uma cidade, o app faz 2 buscas no Places (até 40 cafés) e guarda o resultado só enquanto a página está aberta. Os campos de nota, fotos, horário e avaliações estão nas faixas mais caras da Places API, então vale acompanhar o painel de faturamento nas primeiras semanas e ajustar a cota diária.

## Outros serviços usados

- **Open-Meteo** (gratuito, sem chave): clima do dia e localização da cidade digitada.
- **Google Fonts**: Fraunces e Instrument Sans.

## Configurações extras

Em `config.js`:

- `INDICAR_EMAIL`: e-mail que recebe as indicações de cafés. Se ficar vazio, o formulário avisa que as indicações ainda não estão ativas.
