/**
 * This class is the container for Functional Dependencies.
 * @param lhs left hand side of the functional dependencies, should be an array of strings
 * @param rhs right hand side of the functional dependencies, should be an array of strings
 * @constructor
 */
function FunctionalDependency(lhs, rhs){
    lhs.sort();
    rhs.sort();
    this.lhs = lhs;
    this.rhs = rhs;

    /**
     * Checks if the parameters of the other functional dependency is the same as the one on the LHS
     * @param other
     * @returns {boolean}
     */
    this.equals = function(other) {
        if(!Array.isArray(other.lhs) || !Array.isArray(this.lhs))
            return false;

        if(!Array.isArray(other.rhs) || !Array.isArray(this.rhs))
            return false;

        if(other.lhs.length !== this.lhs.length)
            return false;

        for(var i = 0; i < this.lhs.length; i++){
            if(other.lhs[i] !== this.lhs[i]) return false;
        }

        if(other.rhs.length !== this.rhs.length)
            return false;

        for(var i = 0; i < this.rhs.length; i++){
            if(other.rhs[i] !== this.rhs[i]) return false;
        }
    };

    this.toString = function () {
        str = "{";
        for(var i = 0 ; i  < this.lhs.length; i++){
            str += this.lhs[i];
            if(i+1 !== this.lhs.length)
                str += ", ";
        }
        str += "}->{";
        for(var i = 0 ; i  < this.rhs.length; i++){
            str += this.rhs[i];
            if(i+1 !== this.rhs.length)
                str += ", ";
        }
        str += "}";
        return str;
    };

    this.toLatex = function () {
        str = "\\{";
        for(var i = 0 ; i  < this.lhs.length; i++){
            str += this.lhs[i];
            if(i+1 !== this.lhs.length)
                str += ", ";
        }
        str += "\\}  \\rightarrow \\{";
        for(var i = 0 ; i  < this.rhs.length; i++){
            str += this.rhs[i];
            if(i+1 !== this.rhs.length)
                str += ", ";
        }
        str += "\\}";
        return str;
    };

    this.isTrivial = function () {
      return isSubset(rhs,new Set(lhs));
    };
}

/**
 * Represents a Relational Schema
 * @param fdList - list of functional dependencies.
 * @constructor
 */
function RelationalSchema(fdList){
    this.functionalDependencies = fdList;

    /**
     * This returns the attributes within the schema.
     * @returns {Set} of attributes.
     */
    this.extractAttributes = function () {
        var attributeSet = new Set([]);
        for(var i = 0; i < this.functionalDependencies.length; i++){
            for(var j = 0; j < this.functionalDependencies[i].lhs.length; j++){
                attributeSet.add(this.functionalDependencies[i].lhs[j]);
            }
            for(var j = 0; j < this.functionalDependencies[i].rhs.length; j++){
                attributeSet.add(this.functionalDependencies[i].rhs[j]);
            }
        }
        return attributeSet;
    };

    /**
     * This function calculates the attribute closure of a relational schema.
     * @param attributeSet - set of attributes
     */
    this.attributeClosure = function (attributeSet) {
        var closure = attributeSet;
        var prev_length = 0;
        while(closure.size !== prev_length){
            prev_length = closure.size;
            for(var i = 0; i < this.functionalDependencies.length; i++){
                if(isSubset(this.functionalDependencies[i].lhs, closure)){
                    for(var j = 0; j < this.functionalDependencies[i].rhs.length; j++){
                        closure.add(this.functionalDependencies[i].rhs[j])
                    }
                }
            }
        }
        return closure;
    };

    /**
     * Returns all possible attribute closures within the schema
     */
    this.allAttributeClosures = function () {
        var attributes = this.extractAttributes();
        var attrArray = [];
        attributes.forEach( function(attr){
            attrArray.push(attr)
        });
        powSet = powerSet(attrArray);
        var allClosures = [];
        for(var i = 0; i < powSet.length; i++)
            allClosures.push([powSet[i], this.attributeClosure(new Set(powSet[i]))]);
        return allClosures;
    };

    /**
     * Returns the functional dependency closure on F+
     */
    this.closure = function () {
        var attrClosure = this.allAttributeClosures();
        var Fplus = [];
        for(var i = 0; i < attrClosure.length; i++){

            if(attrClosure[i].length === 0)
                continue;

            var left = attrClosure[i][0];
            var right = [];

            attrClosure[i][1].forEach(function (val) {
                right.push(val);
            });

            var options  = powerSet(right);

            for(var j = 0; j < options.length; j++){
                if(options[j].length > 0)
                    Fplus.push(new FunctionalDependency(left, options[j]));
            }
        }

        return Fplus;
    };

    this.lookUpAttributeClosure = function(key) {
        var attrClosure = this.allAttributeClosures();
        for(var i = 0; i < attrClosure.length; i++){
            if(arrayEquals(attrClosure[i][0], key)){
                return setToArray(attrClosure[i][1]);
            }
        }
        return [];
    };

    this.minimize = function (key) {
        var closureLength = this.extractAttributes().size;
        for(var i = 0; i < key.length; i++){
            var newKey = key.slice();
            newKey.splice(i,1);
            if(closureLength === this.lookUpAttributeClosure(newKey).length){
                return this.minimize(newKey);
            }
        }
        return key;
    };

    this.canMinimize = function (key) {
        var closureLength = this.extractAttributes().size;
        for(var i = 0; i < key.length; i++){
            var newKey = key.slice();
            newKey.splice(i,1);
            if(closureLength === this.lookUpAttributeClosure(newKey).length){
                return true;
            }
        }
        return false;
    };

    /**
     * Returns all candidate keys
     */
    this.candidateKeys = function(){
        var candidateKeyList = [this.minimize(setToArray(this.extractAttributes()))];
        var closure = this.closure();
        for(var i = 0 ; i < candidateKeyList.length; i++){
            for(var j = 0; j < closure.length; j++){
                var potentialKey = setUnion(new Set(closure[j].lhs), new Set(setDifference(new Set(candidateKeyList[i]), new Set(closure[j].rhs))));
                var found = false;
                for(var k = 0; k < candidateKeyList.length; k++){
                    if(isSubset(candidateKeyList[k], new Set(potentialKey)))
                        found = true;
                }

                if(!found){
                    candidateKeyList.push(this.minimize(potentialKey));
                }

            }
        }
        return candidateKeyList;
    };

    /**
     * Returns all superkeys
     */
    this.superKeys = function(){
        var candidateKeyList = [];
        var numberOfAttributes = this.extractAttributes().size;
        var attrClosure = this.allAttributeClosures();
        attrClosure.sort(function (a, b) { return b[0].length - a[0].length });
        attrClosure.reverse();
        for(var i = 0; i < attrClosure.length; i++){
            var rhs = [];
            attrClosure[i][1].forEach(function (val) {
                rhs.push(val);
            });

            if(rhs.length === numberOfAttributes) {
                candidateKeyList.push(attrClosure[i][0]);
            }
        }
        return candidateKeyList;
    };
    /**
     * Returns true if is in second nf
     * i.e.
     * Given X->A in F+
     *   X->A is trivial
     *   or X is not a proper subset of candidate keys
     *   or A is part of some candidate key
     */
    this.isSecondNF = function() {
        var fdClosure = this.closure();
        var candidateKeys = this.candidateKeys();
        for(var i = 0 ; i < fdClosure.length; i++){

            if(fdClosure[i].isTrivial())
                continue;

            var isNotProperSubsetOfCandidateKeys = false;
            for(var j = 0; j < candidateKeys.length; j++){
                if(!isProperSubset(fdClosure[i].lhs, new Set(candidateKeys[j])))
                    isNotProperSubsetOfCandidateKeys = true;
            }
            if(isNotProperSubsetOfCandidateKeys)
                continue;

            var isPartOfCandidateKey = false;
            for(var j = 0; j < candidateKeys.length; j++){
                if(isSubset(fdClosure[i].rhs, new Set(candidateKeys[j])))
                    isPartOfCandidateKey = true;
            }
            if(isPartOfCandidateKey)
                continue;

            console.log(fdClosure[i].toString() + " violates BCNF" );
            return false;
        }
        return true;
    };

    /**
     * Checks is relation is in third normal form
     * i.e.
     * Given X->A in F+
     *   X->A is trivial
     *   X is a superkey for R
     *   A is part of some candidate key
     */
    this.isThirdNF = function () {
        var fdClosure = this.closure();
        var candidateKeys = this.candidateKeys();
        var superKeys = this.superKeys();
        console.log(superKeys);
        for(var i = 0 ; i < fdClosure.length; i++){

            if(fdClosure[i].isTrivial())
                continue;

            var isSuperKey = false;
            for(var j = 0; j < superKeys.length; j++) {
                if(fdClosure[i].lhs.length !== superKeys[j].length)
                    continue;

                var ident = true;
                superKeys[j].sort();
                fdClosure[i].lhs.sort();

                for(var k = 0; k < superKeys[j].length; k++){
                    if(superKeys[j][k] !== fdClosure[i].lhs[k]){
                        console.log("Checking "+fdClosure[i].lhs+", "+superKeys[j]);
                        ident = false;
                    }
                }
                if(ident) isSuperKey = true;
            }
            if(isSuperKey) continue;

            var isPartOfCK = false;
            for(var  j = 0 ; j < candidateKeys.length; j++){
                if(isSubset(fdClosure[i].rhs, new Set(candidateKeys[i])))
                    isPartOfCK = true;
            }
            if(isPartOfCK) continue;

            console.log(fdClosure[i].toString() + " violates 3nf" );
            return false;
        }
        return true;
    };

    /**
     * Checks is relation is in Boyce-Codd normal form
     * i.e.
     * Given X->A in F+
     *   X->A is trivial
     *   X->A is a super key
     */
    this.isBCNF = function () {
        var fdClosure = this.closure();
        for(var i = 0 ; i < fdClosure.length; i++){
            var candidateKeys = this.candidateKeys();
            console.log(candidateKeys);
            for(var i = 0 ; i < fdClosure.length; i++){

                if(fdClosure[i].isTrivial())
                    continue;

                var isSuperKey = false;
                for(var j = 0; j < candidateKeys.length; j++){
                    if(isSubset(candidateKeys[j], new Set(fdClosure[i].lhs)))
                        isSuperKey = true;
                }
                if(isSuperKey) continue;

                console.log(fdClosure[i].toString() + " violates BCNF" );
                return false;
            }
            return true;
        }
    };
}

/**
 * Check if two arrays are the same. WTF does JS not have an in-built method for this?
 * @param arr1
 * @param arr2
 */
function arrayEquals(arr1, arr2){

    if(arr1.length !== arr2.length)
        return false;

    for(var  i = 0 ; i < arr1.length; i++){
        if(arr1[i] !== arr2[i])
            return false;
    }

    return true;
}

/**
 * Convert a set to array
 */
function setToArray(set){
    var arr = [];
    set.forEach(function (val) {
        arr.push(val);
    });
    return arr;
}
/**
 * Check if a subset is a subset of another set
 * @param subset - The set you are checking
 * @param superset - The super set
 * @returns {boolean}
 */
function isSubset(subset, superset){
    for(var  i = 0; i < subset.length; i++){
        if(!superset.has(subset[i])){
            return false;
        }
    }
    return true;
}

/**
 * Proper subset
 * @param subset
 * @param superdet
 */
function isProperSubset(subset, superset) {
    return (subset.length < superset.length) && isSubset(subset,superset);
}


/**
 * Find the set difference between two sets. i.e. set1 - set2
 * @param set1
 * @param set2
 */
function setDifference(set1, set2) {
    var newSet = [];
    set1.forEach(function (val) {
        if(!set2.has(val)){
            newSet.push(val);
        }
    });
    return newSet;
}

/**
 * Find the set union between two sets
 * @param set1
 * @param set2
 */
function setUnion(set1, set2) {
    var newSet = new Set();
    set1.forEach(function (val) {
        newSet.add(val);
    });
    set2.forEach(function (val) {
        newSet.add(val);
    });
    var asArray = [];
    newSet.forEach(function (val) {
        asArray.push(val);
    });
    return asArray;
}

/**
 * Returns the prowerSet of a list
 * @param lst - the list
 * @returns {Array}
 */
function powerSet(lst) {
    function fork(i, t) {
        if (i === lst.length) {
            result.push(t);
            return;
        }
        fork(i + 1, t.concat([lst[i]]));
        fork(i + 1, t);
    }
    var result = [];
    fork(0, []);
    return result;
}



var ParserStates = {
    no_input: 1,
    in_lhs: 2,
    in_rhs: 3,
    in_arrow: 4,
    expect_rhs: 5,
    expect_comma: 6,
    expect_arrow: 7
};

/**
 * Function parses all the string attributes
 * @param input - String with functional dependencies
 */
function parseAttributes(input){
    var curr_state = ParserStates.no_input;
    var lhs = [];
    var rhs = [];
    var fds = [];
    var curr_token = "";
    for(i = 0; i < input.length; i++){
        if(curr_state === ParserStates.no_input){
            if(input[i] === "{"){
                curr_state = ParserStates.in_lhs;
            } else if(input[i] !== " "){
                throw "Format Error!! Expected a functional dependency {a,b}->{c} instead found token: "+i;
            }
        }

        else if(curr_state === ParserStates.in_lhs) {
            if(input[i] === ","){
                lhs.push(curr_token);
                curr_token = "";
            } else if(input[i] === "}") {
                if(curr_token === "") {
                    throw "Format error!! Expected something between the comma and brace!"
                }
                lhs.push(curr_token);
                curr_token = "";
                curr_state = ParserStates.expect_arrow;
            } else if(input[i] !== " ") {
                curr_token += input[i];
            }
        }

        else if(curr_state === ParserStates.expect_arrow) {
            if(input[i] === "-"){
                curr_state = ParserStates.in_arrow;
            } else if (input[i] !== " "){
                throw "Format Error!!  An arrow -> instead found token: " + input[i] + i + "IN_ARROW";
            }
        }

        else if(curr_state === ParserStates.in_arrow) {
            if(input[i] !== ">") {
                throw "Format Error!!  An arrow -> instead found token: -" + input[i];
            } else {
                curr_state = ParserStates.expect_rhs;
            }
        }

        else if(curr_state === ParserStates.expect_rhs){
            if(input[i] === "{"){
                curr_state = ParserStates.in_rhs;
            } else if(input[i] !== " "){
                throw "Format Error!! Expected a functional dependency {a,b}->{c} instead found token: " + input[i];
            }

        }

        else if(curr_state === ParserStates.in_rhs) {
            if(input[i] === ","){
                rhs.push(curr_token);
                curr_token = "";
            } else if(input[i] === "}") {
                curr_state = ParserStates.expect_comma;
                if(curr_token === "") {
                    throw "Format error!! Expected something between the comma and brace!"
                }

                rhs.push(curr_token);
                curr_token = "";
                console.log("creating FD " + lhs + "->"+ rhs);
                fds.push(new FunctionalDependency(lhs,rhs));
                lhs = [];
                rhs = [];
            } else if(input[i] !== " ") {
                curr_token += input[i];
            }
        }

        else if(curr_state === ParserStates.expect_comma){
            if(input[i] === ","){
                curr_state = ParserStates.no_input;
            } else if(input[i] !== " "){
                throw "Format Error!! Only spaces and commas should separate FDs instead found " + input[i];
            }
        }
    }

    return fds;
}

/**
 * Renders the attribute closures and marks them as and when they are needed.
 * @param attrs - The attribute closure.
 * @param numberOfAttributes - The number of attributes in the relation.
 * @param relation - The relation of interest
 */
function renderAttributeClosures(attrs, numberOfAttributes, relation){
    var htmlString = "<ul>";
    attrs.sort(function (a, b) { return b[0].length - a[0].length });
    attrs.reverse();
    for(var i = 0; i < attrs.length; i++){
        htmlString += "<li>";
        var latexString = "\\{ ";
        for(var j = 0; j < attrs[i][0].length; j++){
            latexString += attrs[i][0][j];
            if(j + 1  !== attrs[i][0].length){
                latexString += ", ";
            }
        }
        latexString += "\\}+ = \\{";

        var rhs = [];
        attrs[i][1].forEach(function (val) {
           rhs.push(val);
        });


        for(j = 0; j < rhs.length; j++){
            latexString += rhs[j];
            if(j + 1  !== rhs.length){
                latexString += ", ";
            }
        }
        latexString += "\\}";

        htmlString += katex.renderToString(latexString, {
            throwOnError: false
        });

        if(rhs.length === numberOfAttributes){
            if(!relation.canMinimize(attrs[i][0])){
                htmlString += "<span class='badge badge-success'>Candidate Key</span>";
            }
            else {
                htmlString += "<span class='badge badge-info'>Super Key</span>";
            }
        }

        htmlString += "</li>";
    }
    htmlString += "</ul>";
    document.getElementById("attribute_closures").innerHTML = htmlString;
}

function renderFunctionalClosure(closure){
    var htmlString = "<p>The following elements are in F+:</p><ul>";
    for(var i = 0 ; i < closure.length; i++){
        htmlString += "<li>";
        htmlString += katex.renderToString(closure[i].toLatex(), {
            throwOnError: false
        });
        if(closure[i].isTrivial()){
            htmlString += "<span class='badge badge-dark'>Trivial</span>";
        }
        htmlString += "</li>";
    }
    htmlString += "</ul>";
    document.getElementById("fd_closure").innerHTML = htmlString;
}

function renderNF(warning, id){
    if(warning) {
        try {
            document.getElementById(id).classList.add("list-group-item-success");
            document.getElementById(id).classList.remove("list-group-item-danger");
        } catch (e) {
        }

    } else {
        try {
            document.getElementById(id).classList.add("list-group-item-danger");
            document.getElementById(id).classList.remove("list-group-item-success");
        } catch (e) {
        }
    }
}

try {
    window.onload = function (ev) {
        var input = document.getElementById("functional_deps");
        console.log("hi");
        input.addEventListener("change", function (evt) {
            try {
                fds = parseAttributes(input.value);
                console.log("got " + fds.length + " values");
                for (var j = 0; j < fds.length; j++) {
                    console.log(fds[j].toString());
                }
                var relationalSchema = new RelationalSchema(fds);
                var attributeClosures = relationalSchema.allAttributeClosures();
                renderAttributeClosures(attributeClosures, relationalSchema.extractAttributes().size, relationalSchema);
                renderFunctionalClosure(relationalSchema.closure());

                renderNF(relationalSchema.isSecondNF(), "2NF");
                renderNF(relationalSchema.isThirdNF(), "3NF");
                renderNF(relationalSchema.isBCNF(), "BCNF");
                document.getElementById("errorbox").innerHTML = "";
            } catch (e) {
                console.error("Failed to parse input" + e);
                document.getElementById("errorbox").innerHTML = e;
            }
        });
    };
} catch (e){
    console.log("Running in headless mode on node");
    module.exports = {};
    module.exports.FunctionalDependency= FunctionalDependency;
    module.exports.RelationalSchema = RelationalSchema;
}