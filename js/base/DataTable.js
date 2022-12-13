export class DataTable {

    #entities;
    #attributes;
    #labels;
    #tuples;

    constructor(entities, attributes, labels, aggregator) {
        this.#entities = entities;
        this.#attributes = attributes;
        this.#labels = labels;
        this.#tuples = entities.map((e, i) =>
            new Proxy(e, { // Use proxy to propagate index-based access and edits to the underlying graph
                get: (e, i) => { // Delegate indexed read access
                    return e[attributes[i]];
                },
                set: (e, i, value) => { // Delegate indexed write access
                    e[attributes[i]] = value;
                    return true;
                }
            }),
        );
        this.min = aggregator.min; // Provide min and max as offered by the aggregator
        this.max = aggregator.max;
    }

    get entities() { // Enable key-based access to attribute values
        return this.#entities;
    }

    get attributes() { // The set of attributes
        return this.#attributes;
    }

    get labels() { // The set of attribute labels
        return this.#labels;
    }

    get tuples() { // Enable index-based access to attribute values
        return this.#tuples;
    }

    static emptyData() {
        return new DataTable([], [], [], {min: null, max: null});
    }

}