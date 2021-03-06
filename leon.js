var LEON = (function() {

    var _ = {
        /**
         * LEON's error string
         */
        error: null,

        /**
         * set typeGuessing to false if 
         * you want to force the decoder to return strings
         */
        typeGuessing: true,


        /**
         * encode an object
         */
        encode: function(obj) {
            if (typeof obj != 'object') {
                return _.encodeVal(obj);
            }
            var key, val, i = 0, subObject;
            var outputArray = [];
            for (key in obj) {
                val = obj[key];
                if (typeof val == 'object') {
                    subObject = _.encode(obj[key]);
                    val = '~' + subObject;
                    if ((subObject.length === 0) || 
                        (subObject.length > 0 && 
                        subObject[subObject.length - 1] === '_')) {
                        val += '-0';
                    }
                    val += '~';
                } else {
                    val = _.encodeVal(val);
                }
                if (key == i) {
                    outputArray.push(val);
                } else {
                    outputArray.push(_.esc(key) + '_' + val);
                }
                i++;
            }
            return outputArray.join('.');
        },

        /**
         * private function esc(val)
         * escape a string
         */
        esc: function(val) {
            val = val.replace(/\-([^1-9])/g, '--$1'); // replace - with --, if there is no number following
            val = val.replace(/\_/g, '-_');
            val = val.replace(/\./g, '-.');
            val = val.replace(/\~/g, '-~');
            return val;
        },

        /**
         * private function unEsc(val)
         * unescape a string
         */
        unEsc: function(val) {
            val = val.replace(/\-\-0/g, '---00');
            val = val.replace(/\-0/g, '');
            val = val.replace(/\-\-/g, '-');
            val = val.replace(/\-\_/g, '_');
            val = val.replace(/\-\./g, '.');
            val = val.replace(/\-\~/g, '~');
            return val;
        },


        /**
         * encode a value
         */
        encodeVal: function(val) {
            if (typeof val == 'string') {
                return _.esc(val);
            }
            if (typeof val == 'boolean') {
                return (val) ? 'true' : 'false';
            }
            if (typeof val == 'number') {
                return _.esc(val.toString());
            }
            return '';
        },


        /**
         * guess the value's type
         * @param val the value as string
         * @return a typeGuessed val
         */
        guessValueType: function(val) {
            if (_.typeGuessing === false || typeof val !== 'string') {
                return val;
            }
            if (val === '') {
                return [];
            }
            if (/^[-+]?\d+(e[0-9]+)?$/.test(val)) {
                return parseInt(val);
            }
            if (/^[-+]?[0-9]+(\.[0-9]+)?(e[0-9]+)?$/.test(val)) {
                return parseFloat(val);
            }
            if (val === 'true' || val === 'false') {
                return (val === 'true') ? true : false;
            }
            if (val === 'undefined') {
                return undefined;
            }
            if (val === 'null') {
                return null;
            }
            if (val === 'NaN') {
                return NaN;
            }
            return val;
        },

        /**
         * decode a LEON string
         */
        decode: function(str) {
            var expressions = undefined;
            var exprKey, exprVal,exprIndex = 0,levelDir = 1,underScore = -1;
            var i,level =0, j = 0;
            _.error = null;
            if (typeof str !== 'string') {
                _.error = 'bad parameter.';
                return undefined;
            }
            str += '.';
            for (i = 0; i < str.length; i++) {
                
                if (str[i] === '-') {
                    if (i === str.length-1 || "0123456789~-_.".indexOf(str[i+1]) < 0) {
                        _.error = 'parse error: unexpected - at ' + i;
                        return undefined;
                    }
                    i++;
                    continue;
                }
                if (str[i] === '_' && level === 0) {
                    if (underScore !== -1) {
                        _.error = 'parse error: unexpected _ at ' + i;
                        return undefined;
                    }
                    underScore = i;
                    continue;
                }
                if (str[i] === '~') {
                    if (i === 0) {
                        level++;
                        levelDir = 1;
                        continue;
                    }
                    if (str[i-1] === '_' || str[i-1] === '.') {
                        if ((i < 2) || str[i-2] != '-') {
                            level++;
                            levelDir = 1;
                            continue;
                        }
                    }
                    if (str[i-1] === '~') {
                        if ((i < 2) || str[i-1] != '-') {
                            level += levelDir;
                            continue;
                        }
                    }
                    level--;
                    levelDir = -1;
                    if (level < 0) {
                        _.error = 'parse error: unexpected ~ at ' + i;
                        return undefined;
                    }
                    continue;
                }
                if (str[i] === '.' && level === 0) {
                    if (underScore >= j) {
                        exprKey = _.unEsc(str.slice(j, underScore));
                        exprVal = str.slice(underScore + 1, i);
                        if (expressions === undefined) {
                            expressions = {};
                        }
                    } else {
                        exprKey = exprIndex;
                        exprVal = str.slice(j, i);
                        if (expressions === undefined) {
                            expressions = [];
                        }
                    }
                    j = i + 1;
                    exprIndex++;
                    underScore = -1;
                    if (exprVal[0] === '~') {
                        expressions[exprKey] = _.decode(exprVal.slice(1, exprVal.lastIndexOf('~')));
                        if (expressions[exprKey] === 'undefined') {
                            LEON.error = 'Error in sub expression ' + exprVal + ':\n' + LEON.error;
                            return undefined;
                        }
                    } else {
                        expressions[exprKey] = _.guessValueType(_.unEsc(exprVal));
                    }
                }
            }
            if (level > 0) {
                _.error = 'parse error: missing ~';
                return undefined;
            }
            
            if (expressions instanceof Array && expressions.length === 1) {
                return expressions[0];
            }
            return expressions;
        }
    };

    return {
        encode: _.encode, 
        decode: _.decode, 
        error: function() { return _.error }, 
        typeGuessing: function(b) { _.typeGuessing = b }
    };    

}());
