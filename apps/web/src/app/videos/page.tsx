import Link from "next/link";
import { EmptyState } from "../../components/ui/EmptyState";
import { PlayIcon } from "../../components/icons";

/**
 * ReferenceVideo tem 0 linhas hoje (scrapers de vídeo BR/US ainda não
 * implementados) — quando a coleta popular a tabela, essa tela passa a
 * mostrar o grid de vídeos automaticamente, sem precisar de código novo
 * (mesmo padrão de /explorar: EmptyState some sozinho quando há dado).
 */
export default function VideosPage() {
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState
        icon={<PlayIcon className="h-8 w-8" />}
        title="Vídeos de referência serão exibidos após a próxima coleta de dados"
        message="Quando os dados chegarem em produção, essa tela popula automaticamente."
      />
      <Link
        href="/oportunidades"
        className="rounded-md bg-spy-indigo px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light"
      >
        Ver oportunidades disponíveis
      </Link>
    </div>
  );
}
