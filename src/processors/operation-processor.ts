import Application from "../application";
import Resource from "../resource";
import { HasId, Operation, ResourceConstructor, ResourceSchemaRelationship } from "../types";

const pick = (object = {}, list = []): {} => {
  return list.reduce((acc, key) => {
    const hasProperty = object.hasOwnProperty(key);
    return hasProperty ? { ...acc, [key]: object[key] } : acc;
  }, {});
};

const promiseHashMap = async (hash, callback) => {
  const keys = Object.keys(hash);
  const promises = await Promise.all(
    keys.map(async key => {
      return {
        key,
        value: await callback(key)
      };
    })
  );

  return promises.reduce((accum, { key, value }) => {
    return { ...accum, [key]: value };
  }, {});
};

const promiseHash = async (hash = {}) => {
  const promises = await Promise.all(
    Object.entries(hash).map(async ([key, value]) => ({
      key,
      value: await value
    }))
  );

  return promises.reduce((acc, { key, value }) => {
    return { ...acc, [key]: value };
  }, {});
};

export default class OperationProcessor<ResourceT = Resource> {
  static async shouldHandle(resourceType: string): Promise<boolean> {
    return false;
  }

  protected attributes = {};
  protected relationships = {};

  constructor(
    protected app: Application,
    public resourceClass: ResourceConstructor
  ) {}

  async execute(op: Operation): Promise<ResourceT | ResourceT[] | void> {
    const action: string = op.op;
    const result = this[action] && (await this[action].call(this, op));

    return this.convertToResources(op, result);
  }

  async getComputedProperties(
    op: Operation,
    resourceClass: ResourceConstructor,
    record: HasId
  ) {
    const typeFields = op.params.fields && op.params.fields[resourceClass.type];

    const attributes = typeFields
      ? pick(this.attributes, typeFields)
      : this.attributes;

    return promiseHashMap(attributes, key =>
      attributes[key].call(this, record)
    );
  }

  async getAttributes(
    op: Operation,
    resourceClass: ResourceConstructor,
    record: HasId
  ) {
    const attributeKeys =
      (op.params.fields && op.params.fields[resourceClass.type]) ||
      Object.keys(resourceClass.schema.attributes);

    return pick(record, attributeKeys);
  }

  async getRelationships(op: Operation, record: HasId): Object {
    const relationships = (op.params.include || []).reduce(
      (acc, relationshipName) => {
        const relationship = this.resourceClass.schema.relationships[
          relationshipName
        ];

        return relationship
          ? {
              ...acc,
              [relationshipName]: this.getRelationship(relationship, record)
            }
          : acc;
      },
      {}
    );

    return promiseHash(relationships);
  }

  async getRelationship(
    relationship: ResourceSchemaRelationship,
    record: HasId
  ): Promise<HasId | HasId[]> {
    return (this.relationships[relationship.key], function() {}).call(
      this,
      record
    );
  }

  async convertToResources(op: Operation, records: HasId[] | HasId) {
    if (Array.isArray(records)) {
      return Promise.all(
        records.map(record => {
          return this.convertToResources(op, record);
        })
      );
    }

    const record = { ...records };
    const resourceClass = await this.resourceFor(op.ref.type);

    const [attributes, computedAttributes, relationships] = await Promise.all([
      this.getAttributes(op, resourceClass, record),
      this.getComputedProperties(op, resourceClass, record),
      this.getRelationships(op, record)
    ]);

    return new resourceClass({
      relationships,
      id: record.id,
      attributes: {
        ...attributes,
        ...computedAttributes
      }
    });
  }

  async resourceFor(
    resourceType: string
  ): Promise<ResourceConstructor | undefined> {
    return this.app.resourceFor(resourceType);
  }

  async processorFor(
    resourceType: string
  ): Promise<OperationProcessor | undefined> {
    return this.app.processorFor(resourceType);
  }

  async get(op: Operation): Promise<HasId[]> {
    return [];
  }

  async remove(op: Operation): Promise<void> {
    return Promise.reject();
  }

  async update(op: Operation): Promise<HasId> {
    return Promise.reject();
  }

  async add(op: Operation): Promise<HasId> {
    return Promise.reject();
  }
}
