import CIView from './CIView'
import { overviewRepos, overviewEdges } from '../data/ci-views'

export default function CIDashboardView() {
  return <CIView title="CI Dashboard" repos={overviewRepos} edges={overviewEdges} />
}
