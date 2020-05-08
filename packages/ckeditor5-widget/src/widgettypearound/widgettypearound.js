/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module widget/widgettypearound/widgettypearound
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Template from '@ckeditor/ckeditor5-ui/src/template';
import IconView from '@ckeditor/ckeditor5-ui/src/icon/iconview';

import { isWidget } from '../utils';
import {
	getWidgetTypeAroundDirections,
	getClosestTypeAroundDomButton,
	getTypeAroundButtonDirection,
	getClosestWidgetViewElement,
	directionToWidgetCssClass
} from './utils';

import returnIcon from '../../theme/icons/return-arrow.svg';
import '../../theme/widgettypearound.css';

const POSSIBLE_INSERTION_DIRECTIONS = [ 'before', 'after' ];

/**
 * TODO
 *
 * @extends module:core/plugin~Plugin
 */
export default class WidgetTypeAround extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ Paragraph ];
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'WidgetTypeAround';
	}

	/**
	 * TODO
	 */
	init() {
		this._enableTypeAroundUIInjection();
		this._enableDetectionOfTypeAroundWidgets();
		this._enableInsertingParagraphsOnButtonClick();
	}

	/**
	 * TODO
	 */
	_enableTypeAroundUIInjection() {
		const editor = this.editor;
		const schema = editor.model.schema;

		editor.editing.downcastDispatcher.on( 'insert', ( evt, data, conversionApi ) => {
			const viewElement = conversionApi.mapper.toViewElement( data.item );

			// Filter out non-widgets and inline widgets.
			if ( viewElement && isWidget( viewElement ) && !schema.isInline( data.item ) ) {
				injectUIIntoWidget( editor.editing.view, viewElement );
			}
		}, { priority: 'low' } );
	}

	/**
	 * TODO
	 */
	_enableDetectionOfTypeAroundWidgets() {
		const editor = this.editor;
		const editingView = editor.editing.view;

		editingView.document.registerPostFixer( writer => {
			// Find all widget view elements in the editing root.
			[ ...editingView.createRangeIn( editingView.document.getRoot() ) ]
				.filter( ( { item } ) => isWidget( item ) )
				.forEach( ( { item: widgetViewElement } ) => {
					const newDirections = getWidgetTypeAroundDirections( widgetViewElement );
					const directionClassesToRemove = POSSIBLE_INSERTION_DIRECTIONS
						.filter( direction => !newDirections.includes( direction ) )
						.map( directionToWidgetCssClass );

					// Remove classes that do not make sense any more.
					writer.removeClass( directionClassesToRemove, widgetViewElement );

					// Set CSS classes related to possible directions. They are used so the UI knows
					// which buttons and lines to display.
					writer.addClass( newDirections.map( directionToWidgetCssClass ), widgetViewElement );
				} );
		} );
	}

	/**
	 * TODO
	 */
	_enableInsertingParagraphsOnButtonClick() {
		const editor = this.editor;
		const editingView = editor.editing.view;

		editingView.document.on( 'mousedown', ( evt, domEventData ) => {
			const button = getClosestTypeAroundDomButton( domEventData.domTarget );

			if ( !button ) {
				return;
			}

			const buttonDirection = getTypeAroundButtonDirection( button );
			const widgetViewElement = getClosestWidgetViewElement( button, editingView.domConverter );
			let viewPosition;

			if ( buttonDirection === 'before' ) {
				viewPosition = editingView.createPositionBefore( widgetViewElement );
			} else {
				viewPosition = editingView.createPositionAfter( widgetViewElement );
			}

			const modelPosition = editor.editing.mapper.toModelPosition( viewPosition );

			editor.model.change( writer => {
				const paragraph = writer.createElement( 'paragraph' );

				writer.insert( paragraph, modelPosition );
				writer.setSelection( paragraph, 0 );
			} );

			editingView.focus();
			editingView.scrollToTheSelection();

			domEventData.preventDefault();
			evt.stop();
		} );
	}
}

function injectUIIntoWidget( editingView, widgetViewElement ) {
	editingView.change( writer => {
		const typeAroundWrapper = writer.createUIElement( 'div', {
			class: 'ck ck-reset_all ck-widget__type-around'
		}, function( domDocument ) {
			const wrapperDomElement = this.toDomElement( domDocument );

			injectButtons( wrapperDomElement );

			return wrapperDomElement;
		} );

		// Inject the type around wrapper into the widget's wrapper.
		writer.insert( writer.createPositionAt( widgetViewElement, 'end' ), typeAroundWrapper );
	} );
}

function injectButtons( wrapperDomElement ) {
	for ( const direction of POSSIBLE_INSERTION_DIRECTIONS ) {
		const returnIconView = new IconView();
		returnIconView.viewBox = '0 0 10 8';
		returnIconView.content = returnIcon;

		const buttonTemplate = new Template( {
			tag: 'div',
			attributes: {
				class: [
					'ck',
					`ck-widget__type-around__button ck-widget__type-around__button_${ direction }`
				]
			},
			children: [
				returnIconView
			]
		} );

		wrapperDomElement.appendChild( buttonTemplate.render() );
	}
}
