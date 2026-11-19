
import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import './App.css'

type Cliente = {
  cliente_id: number
  plano: string
  acessos_mes: number
  meses_cliente: number
  cancelou: number
  satisfacao: number
  valor_mensal: number
}

function App() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [plano, setPlano] = useState('Todos')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarDados() {
      try {
        const resposta = await fetch('/clientes.csv')

        if (!resposta.ok) {
          throw new Error('Não foi possível carregar clientes.csv')
        }

        const csv = await resposta.text()

        const resultado = Papa.parse<Cliente>(csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (nome) => nome.replace(/^\uFEFF/, '').trim()
        })

        const dados = resultado.data.filter(
          (cliente) =>
            Number.isFinite(cliente.cliente_id) &&
            Number.isFinite(cliente.cancelou) &&
            Number.isFinite(cliente.acessos_mes) &&
            Number.isFinite(cliente.valor_mensal) &&
            typeof cliente.plano === 'string'
        )

        if (dados.length === 0) {
          throw new Error('O CSV não contém registros válidos.')
        }

        setClientes(dados)
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : 'Erro ao carregar dados'
        )
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [])

  const planos = useMemo(
    () => [...new Set(clientes.map(c => c.plano))].sort(),
    [clientes]
  )

  const filtrados = useMemo(
    () => plano === 'Todos'
      ? clientes
      : clientes.filter(c => c.plano === plano),
    [clientes, plano]
  )

  const total = filtrados.length
  const cancelados = filtrados.filter(c => c.cancelou === 1).length
  const ativos = total - cancelados
  const taxa = total > 0 ? (cancelados / total) * 100 : 0

  const receita = filtrados
    .filter(c => c.cancelou === 0)
    .reduce((soma, c) => soma + c.valor_mensal, 0)

  const moeda = (valor: number) =>
    valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })

  const dadosPlano = planos.map(nome => {
    const grupo = filtrados.filter(c => c.plano === nome)
    const qtdCancelados = grupo.filter(c => c.cancelou === 1).length

    return {
      plano: nome,
      taxa: grupo.length
        ? Number(((qtdCancelados / grupo.length) * 100).toFixed(1))
        : 0
    }
  }).filter(item =>
    plano === 'Todos' || item.plano === plano
  )

  const faixas = [
    { nome: 'Baixo', minimo: 0, maximo: 19 },
    { nome: 'Médio', minimo: 20, maximo: 49 },
    { nome: 'Alto', minimo: 50, maximo: Infinity }
  ]

  const dadosEngajamento = faixas.map(faixa => ({
    nivel: faixa.nome,
    clientes: filtrados.filter(c =>
      c.acessos_mes >= faixa.minimo &&
      c.acessos_mes <= faixa.maximo
    ).length
  }))

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>✦ Data Insights</h2>

        <nav>
          <a className="active" href="#dashboard">📊 Dashboard</a>
          <a href="#clientes">👥 Clientes</a>
          <a href="#relatorios">📈 Relatórios</a>
        </nav>

        <div className="sidebar-footer">
          <p>Portfólio de Dados</p>
          <small>Maria Eduarda Carvalho</small>
        </div>
      </aside>

      <main className="content" id="dashboard">
        <header className="page-header">
          <div>
            <span className="eyebrow">ANÁLISE DE DADOS</span>
            <h1>Visão Geral</h1>
            <p>Indicadores de clientes e retenção.</p>
          </div>
          <span className="tag">Dados simulados</span>
        </header>

        {carregando && <p>Carregando os dados...</p>}
        {erro && <p role="alert" className="error">{erro}</p>}

        {!carregando && !erro && (
          <>
            <div className="filter-bar">
              <label htmlFor="filtro-plano">Filtrar por plano:</label>
              <select
                id="filtro-plano"
                value={plano}
                onChange={e => setPlano(e.target.value)}
              >
                <option value="Todos">Todos os planos</option>
                {planos.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </div>

            <section className="cards">
              <div className="card">
                <span>Total de Clientes</span>
                <h2>{total.toLocaleString('pt-BR')}</h2>
              </div>
              <div className="card">
                <span>Taxa de Cancelamento</span>
                <h2>{taxa.toFixed(2).replace('.', ',')}%</h2>
              </div>
              <div className="card">
                <span>Clientes Ativos</span>
                <h2>{ativos.toLocaleString('pt-BR')}</h2>
              </div>
              <div className="card">
                <span>Receita Mensal Estimada</span>
                <h2>{moeda(receita)}</h2>
              </div>
            </section>

            <section className="charts">
              <div className="chart-card">
                <h3>Cancelamento por Plano</h3>
                <p>Percentual de cancelamentos por assinatura</p>

                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosPlano}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="plano" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(valor) => `${valor}%`} />
                      <Bar
                        dataKey="taxa"
                        name="Cancelamento"
                        fill="#9470c8"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <h3>Nível de Engajamento</h3>
                <p>Clientes por frequência de acesso mensal</p>

                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosEngajamento}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nivel" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="clientes"
                        name="Clientes"
                        fill="#5a8cbe"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="welcome">
              <h2>Sobre esta análise</h2>
              <p>
                Os indicadores são calculados a partir de {total}
                {' '}registros fictícios selecionados.
                Utilize o filtro por plano para explorar os resultados.
              </p>
              <p>
                A receita representa a soma estimada das mensalidades
                dos clientes ativos, não o faturamento realizado.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
