import { fmt } from "../../common/fmt.js";
import { ErrorMessageProvider, getErrorDetail } from "./get-error-detail.js";

export class OperationError extends Error {
  constructor(
    operationName: string,
    message: string,
    dirtyOperation?: boolean
  ) {
    super(getOperationErrorMessage(operationName, message, dirtyOperation));
  }

  public static from({
    operationName,
    error,
    detailProviders,
    dirtyOperation,
  }: {
    operationName: string;
    error: unknown;
    detailProviders?: ErrorMessageProvider[];
    dirtyOperation?: boolean;
  }): OperationError {
    return new OperationError(
      operationName,
      getErrorDetail(error, detailProviders),
      dirtyOperation
    );
  }
}

function getOperationErrorMessage(
  operationName: string,
  message: string,
  shouldCleanup?: boolean
): string | undefined {
  const dirtyOperationMessage = shouldCleanup
    ? `. This operation might have already created AWS resources. Please, run ${fmt.code(
        "basti cleanup"
      )} before retrying`
    : "";

  return (
    `Error ${operationName}. ${fmt.capitalize(message)}` + dirtyOperationMessage
  );
}