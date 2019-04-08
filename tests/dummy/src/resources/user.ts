import { Resource } from "../jsonapi-ts";
import Article from "./article";

export default class User extends Resource {
  static schema = {
    attributes: {
      email: String
    },

    relationships: {
      articles: {
        type: () => Article,
        key: "articles",
        inverse: "author",
        hasMany: true
      }
    }
  };
}
