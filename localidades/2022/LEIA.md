# Localidades do Brasil — Censo Demográfico 2022 (IBGE)

Base usada pela folha de coleta de pontos e pelo planejador para mostrar as localidades ao longo do trajeto
(mapa de navegação, "pelo caminho" e "passa por" no plano do dia).

- Fonte: IBGE. Censo Demográfico 2022: localidades do Brasil. Rio de Janeiro: IBGE, 2025.
  Arquivo `BR_localidades_2022.gpkg` (Localidades_Brasil_gpkg.zip, geoftp do IBGE, 19 nov. 2025):
  https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/
- 96.163 registros = 87.362 localidades (a mesma localidade aparece uma vez por categoria; aqui as categorias
  foram juntadas, sem outra alteração). Coordenadas SIRGAS 2000 (EPSG:4674), 4 casas decimais, como no original.
- Um arquivo por UF (`<UF>.json`): campos cod, nome, categoria, subcategoria, lat, lon, cd_mun, municipio.
  `index.json`: número de localidades e caixa envolvente de cada UF.
