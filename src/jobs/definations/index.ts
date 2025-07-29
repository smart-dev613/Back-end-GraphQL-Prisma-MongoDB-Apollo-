import { mailDefinitions  } from "./mail";

const definitions = [mailDefinitions];

 export const allDefinitions = (agenda) => {
  definitions.forEach((definition) => definition(agenda));
};
