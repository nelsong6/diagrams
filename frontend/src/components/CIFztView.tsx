import CIView from './CIView'
import { fztRepos, fztEdges } from '../data/ci-views'

export default function CIFztView() {
  return <CIView title="CI — fzt" repos={fztRepos} edges={fztEdges} />
}
