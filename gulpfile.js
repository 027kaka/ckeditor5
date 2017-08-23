/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* eslint-env node */

'use strict';

const path = require( 'path' );
const gulp = require( 'gulp' );

// Lint tasks. ---------------------------------------------------------------

const ckeditor5Lint = require( '@ckeditor/ckeditor5-dev-lint' );

gulp.task( 'lint', () => ckeditor5Lint.lint() );
gulp.task( 'lint-staged', () => ckeditor5Lint.lintStaged() );
gulp.task( 'pre-commit', [ 'lint-staged' ] );

// Tests. ---------------------------------------------------------------------

gulp.task( 'test', () => {
	return require( '@ckeditor/ckeditor5-dev-tests' )
		.runAutomatedTests( getTestOptions() );
} );

gulp.task( 'test:manual', () => {
	return require( '@ckeditor/ckeditor5-dev-tests' )
		.runManualTests( getTestOptions() );
} );

function getTestOptions() {
	return require( '@ckeditor/ckeditor5-dev-tests' )
		.parseArguments( process.argv.slice( 2 ) );
}

// Documentation. -------------------------------------------------------------

gulp.task( 'docs', () => {
	const skipLiveSnippets = process.argv.includes( '--skip-snippets' );
	const skipApi = process.argv.includes( '--skip-api' );
	const production = process.argv.includes( '--production' );

	if ( skipApi ) {
		const fs = require( 'fs' );
		const apiJsonPath = './docs/api/output.json';

		if ( fs.existsSync( apiJsonPath ) ) {
			fs.unlinkSync( apiJsonPath );
		}

		return runUmberto( {
			skipLiveSnippets,
			production
		} );
	}

	return buildApiDocs()
		.then( () => {
			return runUmberto( {
				skipLiveSnippets,
				production
			} );
		} );
} );

gulp.task( 'docs:api', buildApiDocs );

function buildApiDocs() {
	assertIsInstalled( '@ckeditor/ckeditor5-dev-docs' );

	const ckeditor5Docs = require( '@ckeditor/ckeditor5-dev-docs' );

	return ckeditor5Docs
		.build( {
			readmePath: path.join( process.cwd(), 'README.md' ),
			sourceFiles: [
				process.cwd() + '/packages/ckeditor5-*/src/**/*.@(js|jsdoc)',
				'!' + process.cwd() + '/packages/ckeditor5-*/src/lib/**/*.js'
			],
			validateOnly: process.argv[ 3 ] == '--validate-only'
		} );
}

function runUmberto( options ) {
	assertIsInstalled( 'umberto' );
	const umberto = require( 'umberto' );

	return umberto.buildSingleProject( {
		configDir: 'docs',
		clean: true,
		skipLiveSnippets: options.skipLiveSnippets,
		snippetOptions: {
			production: options.production
		}
	} );
}

// Translations. --------------------------------------------------------------

gulp.task( 'translations:collect', () => {
	assertIsInstalled( '@ckeditor/ckeditor5-dev-env' );

	return require( '@ckeditor/ckeditor5-dev-env' ).collectTranslations();
} );

gulp.task( 'translations:upload', () => {
	assertIsInstalled( '@ckeditor/ckeditor5-dev-env' );

	return require( '@ckeditor/ckeditor5-dev-env' ).uploadTranslations();
} );

gulp.task( 'translations:download', () => {
	assertIsInstalled( '@ckeditor/ckeditor5-dev-env' );

	return require( '@ckeditor/ckeditor5-dev-env' ).downloadTranslations();
} );

// Releasing. -----------------------------------------------------------------

gulp.task( 'changelog:dependencies', () => {
	assertIsInstalled( '@ckeditor/ckeditor5-dev-env' );

	return require( '@ckeditor/ckeditor5-dev-env' )
		.generateChangelogForSubRepositories( {
			cwd: process.cwd(),
			packages: 'packages'
		} );
} );

gulp.task( 'release:dependencies', () => {
	assertIsInstalled( '@ckeditor/ckeditor5-dev-env' );

	return require( '@ckeditor/ckeditor5-dev-env' )
		.releaseSubRepositories( {
			cwd: process.cwd(),
			packages: 'packages'
		} );
} );

// Utils. ---------------------------------------------------------------------

function assertIsInstalled( packageName ) {
	try {
		require( packageName + '/package.json' );
	} catch ( err ) {
		console.error( `Error: Cannot find package '${ packageName }'.\n` );
		console.error( 'You need to install optional dependencies.' );
		console.error( 'Run: \'npm run install-optional-dependencies\'.' );

		process.exit( 1 );
	}
}
