import inquirer, { DistinctChoice } from "inquirer";
import { AwsAccessDeniedError } from "../../../aws/common/aws-error.js";
import { getDbClusters } from "../../../aws/rds/get-db-clusters.js";
import { getDbInstances } from "../../../aws/rds/get-db-instances.js";
import { AwsDbCluster, AwsDbInstance } from "../../../aws/rds/rds-types.js";
import { Cli, cli } from "../../../common/cli.js";
import { fmt } from "../../../common/fmt.js";
import { getErrorMessage } from "../../../common/get-error-message.js";
import {
  DbClusterTargetInput,
  DbInstanceTargetInput,
} from "../../../target/target-input.js";

export type SelectedTargetInput =
  | DbInstanceTargetInput
  | DbClusterTargetInput
  | { custom: true };

export async function selectTarget(): Promise<SelectedTargetInput> {
  const { instances, clusters } = await getTargets();

  const { target } = await inquirer.prompt({
    type: "list",
    name: "target",
    message: "Select target to connect to",
    choices: [
      ...toInstanceChoices(instances),
      ...toClusterChoices(clusters),
      ...getCustomChoices(),
    ],
  });

  return target;
}

async function getTargets(): Promise<{
  instances: AwsDbInstance[];
  clusters: AwsDbCluster[];
}> {
  const subCli = cli.createSubInstance({ indent: 2 });

  cli.info(`${fmt.green("❯")} Retrieving connection targets:`);

  const instances = await getTargetResources(
    () => getDbInstances(),
    "DB instances",
    subCli
  );

  const clusters = await getTargetResources(
    () => getDbClusters(),
    "DB clusters",
    subCli
  );

  return { instances, clusters };
}

function toInstanceChoices(instances: AwsDbInstance[]): DistinctChoice[] {
  if (!instances.length) {
    return [];
  }
  return [
    new inquirer.Separator("Database instances:"),
    ...instances.map(toInstanceChoice),
  ];
}

function toClusterChoices(clusters: AwsDbCluster[]): DistinctChoice[] {
  if (!clusters.length) {
    return [];
  }
  return [
    new inquirer.Separator("Database clusters:"),
    ...clusters.map(toClusterChoice),
  ];
}

function getCustomChoices(): DistinctChoice[] {
  return [
    new inquirer.Separator(),
    {
      name: "Custom",
      value: {
        custom: true,
      },
    },
  ];
}

async function getTargetResources<T>(
  getResources: () => Promise<T[]>,
  resourceName: string,
  cli: Cli
): Promise<T[]> {
  try {
    cli.progressStart(resourceName);
    const resources = await getResources();
    cli.progressSuccess();
    return resources;
  } catch (error) {
    const warnText =
      error instanceof AwsAccessDeniedError
        ? "Access denied by IAM"
        : `Unexpected error: ${getErrorMessage(error)}`;
    cli.progressWarn({ warnText });
    return [];
  }
}

function toInstanceChoice(
  dbInstance: AwsDbInstance
): DistinctChoice<DbInstanceTargetInput> {
  return {
    name: dbInstance.identifier,
    value: {
      dbInstance,
    },
  };
}

function toClusterChoice(dbCluster: AwsDbCluster): DistinctChoice {
  return {
    name: dbCluster.identifier,
    value: {
      dbCluster,
    },
  };
}