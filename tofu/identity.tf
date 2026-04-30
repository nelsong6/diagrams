# Per-app workload identity for diagrams — replaces reuse of
# infra-shared-identity. Diagrams' backend/config.js only reaches into
# Key Vault (no Cosmos, no App Configuration), so this identity is
# scoped to the four secrets the pod reads at startup:
#   - github-webhook-secret
#   - github-app-id
#   - github-app-private-key
#   - codex-queue-jwt-secret
#
# Note these are the *shared* GitHub App secrets (no `diagrams-` prefix).
# diagrams co-tenants on the same GitHub App as mcp-github / glimmung-github
# does NOT — glimmung has its own dedicated App. If the diagrams App is
# ever forked off into its own repo's App, swap these names but the
# narrowing pattern stays the same.

data "azurerm_resource_group" "infra" {
  name = local.infra.resource_group_name
}

data "azurerm_kubernetes_cluster" "infra" {
  name                = "infra-aks"
  resource_group_name = local.infra.resource_group_name
}

data "azurerm_key_vault" "main" {
  name                = "romaine-kv"
  resource_group_name = local.infra.resource_group_name
}

resource "azurerm_user_assigned_identity" "diagrams" {
  name                = "diagrams-identity"
  resource_group_name = data.azurerm_resource_group.infra.name
  location            = data.azurerm_resource_group.infra.location
}

locals {
  diagrams_kv_secrets = [
    "github-webhook-secret",
    "github-app-id",
    "github-app-private-key",
    "codex-queue-jwt-secret",
  ]
}

resource "azurerm_role_assignment" "diagrams_kv_secrets" {
  for_each             = toset(local.diagrams_kv_secrets)
  scope                = "${data.azurerm_key_vault.main.id}/secrets/${each.key}"
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.diagrams.principal_id
}

resource "azurerm_federated_identity_credential" "diagrams" {
  name                = "aks-diagrams"
  resource_group_name = local.infra.resource_group_name
  parent_id           = azurerm_user_assigned_identity.diagrams.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = data.azurerm_kubernetes_cluster.infra.oidc_issuer_url
  subject             = "system:serviceaccount:diagrams:infra-shared"
}

output "diagrams_identity_client_id" {
  value       = azurerm_user_assigned_identity.diagrams.client_id
  description = "Pin into k8s/serviceaccount.yaml's azure.workload.identity/client-id annotation."
}
