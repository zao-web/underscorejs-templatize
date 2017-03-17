// Utilities similar to WordPress' wp.template().
module.exports = function( gethtml ) {
	gethtml = gethtml || ( function( $ ) {
		return function( id ) {
			id = document.getElementById( id );
			return $ ? $( id ).html() : id.innerHTML;
		};
	} )( window.jQuery || window.$ );

	/*
	 * Underscore's default ERB-style templates are incompatible with PHP
	 * when asp_tags is enabled, so WordPress uses Mustache-inspired templating syntax.
	 *
	 * @see trac ticket: https://core.trac.wordpress.org/ticket/22344.
	 */
	var options = {
		evaluate    : /<#([\s\S]+?)#>/g,
		interpolate : /\{\{\{([\s\S]+?)\}\}\}/g,
		escape      : /\{\{([^\}]+?)\}\}(?!\})/g,
		variable    : 'data'
	};

	var htmlTemplate = _.memoize( function( id ) {
		var compiled;
		return function( data ) {
			if ( ! compiled ) {
				compiled = _.template( template.strings[ id ], options );
				delete template.strings[ id ];
			}

			return compiled( data );
		};
	} );

	/**
	 * wp.template() replacement.
	 *
	 * Fetch a JavaScript template for an id, and return a templating function for it.
	 *
	 * @param  {string} id   A string that corresponds to a DOM element with an id prefixed with "tmpl-".
	 *                       For example, "attachment" maps to "tmpl-attachment".
	 * @return {function}    A function that lazily-compiles the template requested.
	 */
	var scriptTemplate = _.memoize( function( id ) {
		var compiled;

		return function( data ) {
			compiled = compiled || _.template( gethtml( 'tmpl-' + id ), options );
			return compiled( data );
		};
	} );

	function template( tmplName, tmplData, htmlString ) {

		// Store this template object for later use.
		if ( ! template.cache[ tmplName ] ) {
			if ( htmlString ) {
				template.strings[ tmplName ] = htmlString;
				template.cache[ tmplName ] = htmlTemplate( tmplName );
			} else {
				template.cache[ tmplName ] = scriptTemplate( tmplName );
			}
		}

		return tmplData ? template.cache[ tmplName ]( tmplData ) : template.cache[ tmplName ];
	}

	template.cache = {};
	template.strings = {};

	return template;
};
