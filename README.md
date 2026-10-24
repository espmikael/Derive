# Derivé (beta)

**Perca-se na cidade, encontre-se no café.**

O Derivé sorteia um café na sua cidade pra você ir a pé, flanando no caminho. Você marca onde já foi, diz se voltaria, e o app passa a sugerir só lugares novos.

## O que tem

- **Hoje:** escolha a cidade (ou use sua localização), ajuste os filtros e toque em *Sortear café*.
- **Modo surpresa:** só a direção e o tempo de caminhada. O nome do café aparece quando você chega a menos de 100 m.
- **Derivar em grupo:** cada pessoa manda o próprio link, e o sorteio só escolhe cafés onde ninguém do grupo foi.
- **Meus cafés:** lista de onde você já foi, "voltaria / não voltaria" e os bairros que você já conhece.
- **Flanar:** o conceito por trás do app.

Tudo que você marca fica salvo só no navegador (localStorage). Não há servidor, login, chave de API nem custo.

## De onde vêm os dados

Todos gratuitos e sem cadastro:

- **OpenStreetMap** (via Overpass API): cafés, endereço, horário, Wi-Fi, pet friendly, área externa, Instagram e site.
- **Nominatim** (OpenStreetMap): nome da cidade quando você usa sua localização.
- **Open-Meteo**: localização da cidade digitada e o clima do dia.
- **Google Fonts**: Fraunces e Instrument Sans.

O OpenStreetMap é um mapa colaborativo. Se um café estiver faltando ou com informação errada, qualquer pessoa pode corrigir em [openstreetmap.org](https://www.openstreetmap.org) e a correção aparece no Derivé em alguns minutos.

## Publicar no GitHub Pages

1. Suba estes arquivos para um repositório (por exemplo `derive`).
2. No repositório, vá em **Settings → Pages**.
3. Em *Source*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
4. Em um ou dois minutos o site fica em `https://SEU-USUARIO.github.io/derive/`.

## Configurações

Em `config.js`:

- `INDICAR_EMAIL`: e-mail que recebe as indicações de cafés. Se ficar vazio, o formulário avisa que as indicações ainda não estão ativas.
