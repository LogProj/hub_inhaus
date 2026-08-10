import { guardaParametrizador } from "@/lib/epi/guardas"
import { atribuirLoteSchema, desalocarSchema } from "@/lib/epi/schemas"
import { atribuirColaboradores, desalocarColaborador } from "@/lib/epi/atribuicao"
import { lerCorpo, erroInesperado, ok } from "@/lib/epi/http"

export const dynamic = "force-dynamic"

// Atribui, em lote, colaboradores a um turno.
export async function POST(request: Request) {
  const guarda = await guardaParametrizador()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, atribuirLoteSchema)
  if (!corpo.ok) return corpo.response

  try {
    const resultado = await atribuirColaboradores(
      corpo.dados.turnoId,
      corpo.dados.cr,
      corpo.dados.colaboradores.map((c) => ({ cpfHash: c.cpfHash, matricula: c.matricula ?? null })),
    )
    return ok(resultado)
  } catch (e) {
    return erroInesperado(e)
  }
}

// Desaloca um colaborador (volta a "não alocado").
export async function DELETE(request: Request) {
  const guarda = await guardaParametrizador()
  if (!guarda.ok) return guarda.response

  const corpo = await lerCorpo(request, desalocarSchema)
  if (!corpo.ok) return corpo.response

  try {
    await desalocarColaborador(corpo.dados.cpfHash, corpo.dados.cr)
    return ok()
  } catch (e) {
    return erroInesperado(e)
  }
}
