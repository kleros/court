export default function createError(message, cause, context) {
  const causeMixin = cause
    ? {
        cause: {
          value: cause,
          enumerable: true,
        },
      }
    : undefined;

  const contextMixin = context
    ? {
        context: {
          value: context,
          enumerable: true,
        },
      }
    : undefined;

  if (!causeMixin && !contextMixin) {
    throw new Error(message);
  }

  return Object.create(new Error(message), { ...causeMixin, ...contextMixin });
}
