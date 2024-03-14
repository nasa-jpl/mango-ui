import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

export const generateUniqueName = () => {
  return uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
};
