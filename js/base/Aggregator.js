import {Graph} from "./Graph.js";

export class Aggregator {

    static DEFAULT_MIN = Number.POSITIVE_INFINITY;
    static DEFAULT_MAX = Number.NEGATIVE_INFINITY;

    // Basic aggregate functions
    static AGGREGATES = {
        min: (objects, attr) => objects.reduce((min, o) => (o[attr] < min) ? o[attr] : min, Aggregator.DEFAULT_MIN),
        max: (objects, attr) => objects.reduce((max, o) => (o[attr] > max) ? o[attr] : max, Aggregator.DEFAULT_MAX)
    };

    // Aggregate functions that cache their result in the object array, e.g., in nodes['min'].degree
    static CACHED_AGGREGATES = Object.entries(Aggregator.AGGREGATES).reduce((cached, entry) => {
        const [aggr, func] = entry;
        // Append cached version of the aggregate function to the cached object
        cached[aggr] = (objects, attr) => { // The new cached version
            if (objects[aggr][attr] === undefined) {  // Check if cached aggregate value is available
                objects[aggr][attr] = func(objects, attr); // Compute and cache aggregate value
            }
            return objects[aggr][attr];  // Return cached value
        };

        return cached;
    }, {} /* Start with an empty object */);

    constructor(graph, nodeattrs, edgeattrs, gnodeattrs) {

        // Create properties dynamically so that aggregates can be accessed
        // using the following pattern: aggregator[aggregate][(node|edge)][attribute]
        // Examples: aggregator.max.node.degree or aggregator.min.edge.weight
        Object.entries(Aggregator.CACHED_AGGREGATES).forEach(entry => {
            const [aggr, func] = entry;

            this[aggr] = {
                node: {},
                edge: {},
                gnode: {}
            };

            nodeattrs.forEach(attr => {
                Object.defineProperty(this[aggr].node, attr, // The property getter with the name of the attribute
                    {
                        get: function () {
                            return func(graph.nodes, attr); // Call the aggregate function
                        },
                    }
                );
            });

            edgeattrs.forEach(attr => {
                Object.defineProperty(this[aggr].edge, attr, // The property getter with the name of the attribute
                    {
                        get: function () {
                            return func(graph.edges, attr); // Call the aggregate function
                        },
                    }
                );
            });

           gnodeattrs.forEach(attr => {
                Object.defineProperty(this[aggr].gnode, attr, // The property getter with the name of the attribute
                    {
                        get: function () {
                            return func(graph.gnodes, attr); // Call the aggregate function
                        },
                    }
                );
            });
        });

        //console.log(this.max.node.degree);

        // Offer direct access to node and edge aggregates via the
        // following pattern: aggregator[(nodes|edges)][aggregate][attribute]
        // Examples: aggregator.nodes.max.degree or aggregator.edges.min.weight
        this.nodes = {};
        this.edges = {};
        this.gnodes = {};
        Object.entries(Aggregator.CACHED_AGGREGATES).forEach(entry => {
            const [aggr, func] = entry;

            this.nodes[aggr] = {};
            nodeattrs.forEach(attr => {
                Object.defineProperty(this.nodes[aggr], attr, // The property getter with the name of the attribute
                    {
                        get: function () {
                            return func(graph.nodes, attr); // Call the aggregate function
                        },
                    }
                );
            });

            this.edges[aggr] = {};
            edgeattrs.forEach(attr => {
                Object.defineProperty(this.edges[aggr], attr, // The property getter with the name of the attribute
                    {
                        get: function () {
                            return func(graph.edges, attr); // Call the aggregate function
                        },
                    }
                );
            });

            this.gnodes[aggr] = {};
            gnodeattrs.forEach(attr => {
                Object.defineProperty(this.gnodes[aggr], attr, // The property getter with the name of the attribute
                    {
                        get: function () {
                            return func(graph.gnodes, attr); // Call the aggregate function
                        },
                    }
                );
            });
        });

        //console.log(this.nodes.max.degree);

        // Register listeners to clear cache on value changes
        let aggrs = Object.keys(Aggregator.CACHED_AGGREGATES);
        graph.register((type, target, attr, old, value) => {
            if (type === Graph.TAG) {
                aggrs.forEach(aggr => delete graph.nodes[aggr][attr]);
            } else if (type === Graph.LINK) {
                aggrs.forEach(aggr => delete graph.edges[aggr][attr]);
            } else if (type === Graph.GNODE) {
                aggrs.forEach(aggr => delete graph.gnodes[aggr][attr]);
            }
        });
    }
}