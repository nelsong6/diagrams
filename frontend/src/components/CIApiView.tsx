import CIView from './CIView'
import { apiRepos, apiEdges } from '../data/ci-views'

export default function CIApiView() {
  return <CIView title="CI — api" repos={apiRepos} edges={apiEdges} />
}
