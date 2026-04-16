import CIView from './CIView'
import { tofuRepos, tofuEdges } from '../data/ci-views'

export default function CITofuView() {
  return <CIView title="CI — tofu" repos={tofuRepos} edges={tofuEdges} />
}
