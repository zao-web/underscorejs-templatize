/**
 * Utilities similar to WordPress' wp.template(). Provides option to load from a <prefix><id> script tag,
 * or to pass in arbitrary html.
 *
 * Compiled templates are memoized and cached for reuse, based on the tmplName.
 *
 * Example usage:
 *
 * var template = require( './template.js' )(); // Instantiate the template object to a var.
 * var html = template( 'hello-world', { hello: 'Hello World' }, '<h1>{{ data.hello }}</h1>' );
 *
 * // The 'hello-world' template is now cached, so we can simply reference by ID, rather than passing the HTML in again.
 * var html2 = template( 'hello-world', { hello: 'Hello Universe' } );
 *
 * @param  {string}   prefix  The script tag id prefix. Defaults to "tmpl-".
 * @param  {function} gethtml A function to fetch an element by id from the dom.
 */
module.exports = function( prefix, gethtml ) {
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

	/**
	 * Fetch a JavaScript template for a string of html, id it, then return a templating function for it.
	 *
	 * @param  {string} id   A string that corresponds to the html cache array.
	 * @return {function}    A function that lazily-compiles the template requested.
	 */
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
	 * @param  {string} id   A string that corresponds to a DOM element with an id prefixed with `prefix` ("tmpl-" by default).
	 * @return {function}    A function that lazily-compiles the template requested.
	 */
	var scriptTemplate = _.memoize( function( id ) {
		var compiled;

		return function( data ) {
			compiled = compiled || _.template( gethtml( ( prefix || 'tmpl-' ) + id ), options );
			return compiled( data );
		};
	} );

	/**
	 * Fetch a JavaScript template for an id or html string, and return the rendered markup.
	 *
	 * Compiled templates are memoized and cached for reuse, based on the tmplName.
	 *
	 * @param  {string} tmplName   A string that corresponds to a DOM element with an id prefixed with
	 * @param  {object} tmplData   The object containg the data to be injected to the template.
	 * @param  {string} htmlString An html string to use for the template.
	 *	                            For example, '<div>{{ data.helloWord }}</div>'.
	 * @return {string}            The rendered html markup.
	 */
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
