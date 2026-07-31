export type ComponentType =
  | "asset_tree"
  | "kpi_cards"
  | "trend_chart"
  | "table"
  | "scatter"
  | "stacked_bar";

export interface DataQuery {
  source?: string;
  tags?: string[];
  aggregation?: string | null;
  window_days?: number | null;
}

export interface Component {
  id: string;
  type: ComponentType;
  title: string;
  query?: DataQuery | null;
  options?: Record<string, unknown>;
}

export interface Manifest {
  schema_version: string;
  app_name: string;
  description: string;
  reference_architecture: string;
  components: Component[];
}

export interface AppConfig {
  app_name: string;
  description: string;
  reference_architecture: string;
  connectors: { id: string; name: string; type: string }[];
  primary_connector_id: string;
}
