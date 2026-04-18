# Complete Dataset Architecture and Engineering Strategy for the ORACLE Predictive Supply Chain Intelligence System

The modern global supply chain is architected primarily for efficiency, heavily relying on just-in-time delivery models that systematically strip buffer capacity from the network. While highly profitable in stable environments, this lean architecture has rendered global logistics catastrophically fragile under the pressures of geopolitical fragmentation, climate-induced natural disasters, and demand volatility. When a single critical node fails, the lack of absorptive capacity causes cascading paralysis downstream, transforming localized disruptions into global supply chain crises. To mitigate this fragility, the NEXUS-SC (Neural Extended Unified Supply-Chain) platform introduces a paradigm shift from reactive management to predictive, autonomous resilience.

At the core of the NEXUS-SC platform is the ORACLE (AI-Based Predictive Engine) module, an advanced machine learning system designed to ingest multi-modal external signals and generate highly accurate disruption probability scores for individual supply nodes across 24-hour, 72-hour, and 7-day prediction horizons. The outputs from ORACLE directly feed downstream autonomous execution modules: NAVIGATOR, a Deep Reinforcement Learning (RL) routing agent, and BUFFER, an autonomous inventory optimization engine. Because ORACLE dictates autonomous physical actions—such as rerouting ocean freight or triggering secondary supplier purchase orders—the underlying dataset architecture must be exhaustively engineered for zero-trust accuracy, real-time latency, and causal validity. This report outlines the definitive, production-grade dataset strategy required to train and operate the ORACLE predictive AI system at enterprise scale.

## 1. Dataset Architecture

The dataset architecture for the ORACLE system discards traditional batch-reliant relational models in favor of a highly decoupled, event-driven streaming topology that accommodates the fusion of structured telemetry, unstructured text, and complex graph relationships. The architecture follows an advanced Medallion-style data lakehouse paradigm, integrated with a continuous real-time Feature Store and a Heterogeneous Temporal Graph layer.

### 1.1 Raw Data Layer (Bronze Layer)
The ingestion layer captures untransformed, heterogeneous data streams directly from external APIs, sensors, and enterprise systems. To manage varying velocities, the architecture separates ingestion into two distinct paradigms. High-velocity, continuous data streams—such as Automatic Identification System (AIS) vessel telemetry, National Oceanic and Atmospheric Administration (NOAA) weather updates, and Global Database of Events, Language, and Tone (GDELT) geopolitical feeds—are ingested via Apache Kafka distributed event brokers. Batch and micro-batch data, including Enterprise Resource Planning (ERP) logs, static multi-tier Bill of Materials (BOM), and daily macroeconomic indices, are processed using Apache Spark. The raw data is persisted in an Amazon S3 Data Lake utilizing the Apache Parquet and GeoParquet formats, enabling highly compressed, columnar reads that optimize subsequent feature extraction.

### 1.2 Processed Feature Layer (Silver Layer and Feature Store)
Raw streams are consumed by Apache Flink for stateful stream processing, normalization, and missing-value imputation before being pushed to a centralized Feature Store, such as Tecton or Feast. The Feature Store bridges the gap between model training and real-time inference by maintaining two synchronized databases. The online store, backed by Redis, provides sub-millisecond retrieval of the latest feature values required by the live ORACLE inference models and NAVIGATOR RL agents. The offline store, backed by TimescaleDB for time-series telemetry and PostgreSQL for transactional attributes, archives historical feature values. This dual-store architecture allows data scientists to generate point-in-time correct training datasets, definitively eliminating the training-serving skew that frequently corrupts production machine learning systems.

### 1.3 Graph Dataset Layer (Gold Layer)
Because supply chains are inherently network-structured, the processed features are mapped onto a Heterogeneous Temporal Graph. This layer is persisted in Neo4j, a specialized graph database enabling complex traversal queries and multi-tier visibility from Tier-1 original equipment manufacturers (OEMs) down to Tier-N raw material extractors. Data flows continuously from the Feature Store into the graph structure, where edges representing relationships such as transport and dependency are updated with dynamic weights reflecting real-time transit delays and computed risk scores.

### 1.4 Simulation and Synthetic Layer
A dedicated simulation pipeline exists to fuse empirical data with Generative Adversarial Network (GAN) outputs. Extreme events, such as a global pandemic or a canal blockage, occur too infrequently to provide sufficient training data for deep learning models. The synthetic layer creates realistic "Black Swan" datasets using Monte Carlo simulations and digital twin architectures. This allows the training of ORACLE's anomaly detectors and NAVIGATOR's RL agents on cascading failure scenarios without jeopardizing live operational systems.

### 1.5 Feedback Learning Layer
To ensure the system continuously adapts to non-stationary environments, predictions generated by ORACLE and autonomous actions taken by NAVIGATOR and BUFFER are recorded on an immutable distributed ledger utilizing Hyperledger Fabric. Ground-truth resolutions, such as the actual delivery time of a rerouted shipment, are continuously fed back into the system to compute prediction errors. When error thresholds are breached, automated model retraining pipelines are triggered via AWS SageMaker MLOps, ensuring the predictive engine evolves alongside global supply chain dynamics.

## 2. Dataset Types

To achieve precise predictive accuracy under deep uncertainty, the ORACLE system requires the fusion of highly orthogonal data modalities. Each dataset captures a distinct dimension of the global supply chain ecosystem.

### 2.1 Logistics Dataset: AIS Vessel Telemetry
AIS data provides the physical ground-truth of global maritime freight movement, representing the most critical logistics telemetry for intercontinental supply chains. The system ingests and parses specific AIS messages, primarily relying on Message Types 1, 2, and 3 for dynamic positional reporting, and Message Type 5 for static and voyage-related data.

**Data Sources:** MarineTraffic APIs, VesselFinder, and the U.S. Coast Guard Nationwide AIS (NAIS) archive via MarineCadastre.
**Frequency:** Real-time streaming for dynamic kinematics (updates every 2 to 10 seconds for moving vessels) and 6-minute intervals for static voyage data.
**Challenges:** The data suffers from significant noise due to signal collisions in congested ports, missing satellite coverage in open oceans, AIS spoofing by illicit actors, and encrypted Maritime Mobile Service Identity (MMSI) masking in certain historical datasets. Furthermore, linking dynamic positional data with static cargo data requires complex asynchronous stream joining.
**Preprocessing:** The ingestion pipeline applies Kalman filtering to smooth anomalous GPS trajectories. Dead-reckoning imputation algorithms are utilized to project vessel paths during periods of signal loss. Continuous geographic coordinates are discretized by mapping them to H3 or S2 hierarchical spatial indices, allowing the system to convert raw coordinates into standardized shipping lane segments.

| Field Name | Data Type | Description and Context |
|---|---|---|
| MMSI | Integer (30-bit) | Maritime Mobile Service Identity, the primary key for vessel tracking |
| BaseDateTime | Timestamp | UTC timestamp of the AIS message transmission |
| LAT / LON | Float | Geographic coordinates in 1/10,000 minute increments, converted to decimal degrees |
| SOG | Float | Speed Over Ground in 1/10 knot steps, serving as a primary indicator of transit delays |
| Nav_Status | Integer (4-bit) | Navigational status code (e.g., 0=under way using engine, 1=at anchor, 5=moored) |
| ETA | Timestamp | Estimated Time of Arrival, parsed from Message Type 5 |
| Draught | Float | Vessel draught in 1/10 meters, acting as a proxy for cargo load weight |

### 2.2 Weather and Environmental Dataset
Climatological volatility fundamentally alters supply chain topology, dictating the operational viability of shipping lanes and aviation hubs. ORACLE utilizes high-resolution meteorological forecasting to anticipate these disruptions.

**Data Sources:** The NOAA Global Forecast System (GFS), supplemented by the Artificial Intelligence Global Forecast System (AIGFS) and OpenWeatherMap APIs.
**Frequency:** GFS data is initialized in 6-hourly cycles (00Z, 06Z, 12Z, 18Z) with hourly forecast steps out to 120 hours.

| Field Name | Data Type | Description and Context |
|---|---|---|
| spatial_index | String | H3 Hexagon ID representing the geographic bounding box of the forecast |
| forecast_horizon | Integer | Hours from model initialization (e.g., +24, +72, +168) |
| TMP_2m | Float | Surface temperature at 2 meters (Kelvin), critical for cold-chain pharmaceutical logistics |
| PRATE_sfc | Float | Precipitation rate at the surface (kg/m^2/s) |
| UGRD_10m / VGRD_10m | Float | U and V wind components at 10 meters (m/s), utilized to predict port closures and maritime delays |

### 2.3 Geopolitical and Macro-Event Dataset
Political fragmentation, trade tariffs, and localized social unrest can instantly degrade logistics networks. To quantify geopolitical risk, the system ingests structured event representations.

**Data Sources:** The GDELT 2.0 Event Database and Global Knowledge Graph (GKG), alongside ACLED.

| Field Name | Data Type | Description and Context |
|---|---|---|
| EventID | String | Globally unique identifier (GKGRECORDID) assigned to the specific event |
| Actor1_CAMEO | String | CAMEO code defining the instigator |
| Event_Action | Integer | CAMEO event code mapping to the action type |
| GoldsteinScale | Float | A theoretical impact metric ranging from -10.0 to +10.0 (cooperation) |
| AvgTone | Float | Sentiment polarity of the source text, ranging from -100 to +100 |

### 2.4 Commodity Market Dataset
Commodity price variance acts as a crucial leading indicator for raw material scarcity and upstream production bottlenecks.

| Field Name | Data Type | Description and Context |
|---|---|---|
| ticker_symbol | String | Standardized market identifier (e.g., BRENT CRUDE OIL, COPPER) |
| timestamp | Timestamp | Execution time normalized to UTC |
| spot_price | Float | Market execution price normalized to USD |
| realized_volatility | Float | Rolling 7-day standard deviation of asset returns, indicating market stress |

### 2.5 Demand Signal Dataset
A primary objective of NEXUS-SC is the elimination of the bullwhip effect. 

| Field Name | Data Type | Description and Context |
|---|---|---|
| SKU_ID | String | Unique product identifier utilized across all supply chain tiers |
| actual_demand | Integer | Verified sales volume recorded at the POS terminal |
| promo_flag | Boolean | Identifies if current demand is artificially inflated by marketing promotions |
| sentiment_embedding | Vector | High-dimensional embedding representing consumer social media sentiment |

### 2.6 Cybersecurity and Anomaly Dataset (FORTRESS Layer)
The convergence of Information Technology (IT) and Operational Technology (OT) means that a cyber-physical attack translates immediately into a physical freight stoppage.

| Field Name | Data Type | Description and Context |
|---|---|---|
| stix_type | String | The STIX object type |
| tactic_id | String | MITRE ATT&CK Tactic classification |
| network_signature | Vector | Autoencoder embedding generated from inbound API request metadata |
| anomaly_score | Float | Output from isolation forest algorithms ranging from 0.0 to 1.0 |

### 2.7 Supply Chain Graph Dataset
To model the intricate dependencies that shape supply chain operations, empirical data is mapped into a structured graph dataset.

| Field Name | Data Type | Description and Context |
|---|---|---|
| node_id | String | Unique identifier for the firm, warehouse, or port entity |
| node_type | String | Classification of the entity |
| edge_type | String | Definition of the relationship (e.g., "SUPPLIES_TO", "SHIPS_VIA") |
| capacity_constraint | Float | Maximum throughput or production capacity of the node |

## 3. Synthetic Data Generation
The central dilemma of supply chain artificial intelligence is the inherent data scarcity surrounding rare, catastrophic disruptions. 

### 3.1 GAN-Based Data Generation
Generates non-stationary sequences that mirror severe disruptions using TimeGAN combined with Conditional Market-GANs.
### 3.2 Digital Twin and Monte Carlo Simulation
Digital twins simulate physical constraints, geographic realities, and cascading failures using Monte Carlo methods to sample probability distributions of supplier failure rates.
### 3.3 Validating Synthetic Realism
Validation utilizes Jensen-Shannon (JS) divergence to compare empirical and synthetic probability distributions.

## 4. Temporal and Sequential Data Design
### 4.1 Windowing Strategies and Sequence Length
Hierarchical sliding window strategy with a 168-hour lookback sequence ($T_{past}$) and prediction horizons at $t+24h$, $t+72h$, and $t+168h$.
### 4.2 Handling Non-Stationary Data
Continuous differencing and rolling statistics prevent model degradation.
### 4.3 Event-Based vs. Continuous Modeling
Fuses continuous metrics with discrete event representations.

## 5. Graph Data Model
ORACLE models the global supply chain as a Heterogeneous Temporal Graph enabling Graph Neural Networks (GNNs).

## 6. Causal Data Design
### 6.1 Structural Causal Models (SCMs)
Variables encoded into Directed Acyclic Graphs (DAGs) representing data-generating processes.
### 6.2 Lag Variables and Confounding Mitigation
Double/Debiased Machine Learning (DML) framework used to isolate true causal effects.
### 6.3 Counterfactual Scenarios
Enables answering 'What if' counterfactual queries for the NAVIGATOR and BUFFER modules.

## 7. Black Swan and Rare Event Dataset
Balances datasets ensuring models predict optimal conditions and catastrophic failure without generating unnecessary false positives based on Extreme Value Theory (EVT).

## 8. Feature Engineering
Advanced metrics computed via Apache Flink.
### 8.1 Advanced Volatility and Inventory Metrics
Lead-Time Variance, Demand Amplification Factor, Rolling Statistics.
### 8.2 Graph Centrality and Routing Encodings
Degree Centrality, Eigenvector Centrality, Betweenness Centrality, RL State-Space Vector.

## 9. Data Pipeline Design
### 9.1 Ingestion, Processing, and Storage
Apache Kafka for ingestion, Apache Flink for processing, Tecton for Feature Store.
### 9.2 Model Training Pipeline
Managed via AWS SageMaker MLOps using GPU instances.

## 10. Data Quality and Validation
Stringent outler detection, missing data handling, and bias detection protocols.

## 11. Scalability Design
Uses Inductive Graph Representation (GraphSAGE), Federated Learning for visibility across opaque suppliers, and horizontally scaling microservices.

## 12. Conclusion
The dataset architecture for ORACLE ensures a shift to predictive, autonomous execution, using SCMs and synthetic generation to route around Black Swan events before paralysis, aiming for $TTS > TTR$.
