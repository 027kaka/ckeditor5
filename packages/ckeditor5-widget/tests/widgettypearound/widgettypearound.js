/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import ArticlePluginSet from '@ckeditor/ckeditor5-core/tests/_utils/articlepluginset';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import DomEventData from '@ckeditor/ckeditor5-engine/src/view/observer/domeventdata';
import EventInfo from '@ckeditor/ckeditor5-utils/src/eventinfo';
import global from '@ckeditor/ckeditor5-utils/src/dom/global';
import ViewText from '@ckeditor/ckeditor5-engine/src/view/text';

import Widget from '../../src/widget';
import WidgetTypeAround from '../../src/widgettypearound/widgettypearound';
import { toWidget } from '../../src/utils';

import { setData as setModelData, getData as getModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { getCode } from '@ckeditor/ckeditor5-utils/src/keyboard';

describe( 'WidgetTypeAround', () => {
	let element, plugin, editor, editingView, viewDocument, viewRoot;

	beforeEach( async () => {
		element = global.document.createElement( 'div' );
		global.document.body.appendChild( element );

		editor = await ClassicEditor.create( element, {
			plugins: [
				ArticlePluginSet, Widget,

				blockWidgetPlugin, inlineWidgetPlugin
			]
		} );

		editingView = editor.editing.view;
		viewDocument = editingView.document;
		viewRoot = viewDocument.getRoot();
		plugin = editor.plugins.get( WidgetTypeAround );
	} );

	afterEach( async () => {
		element.remove();

		await editor.destroy();
	} );

	describe( 'plugin', () => {
		it( 'is loaded', () => {
			expect( editor.plugins.get( WidgetTypeAround ) ).to.be.instanceOf( WidgetTypeAround );
		} );

		it( 'requires the Paragraph plugin', () => {
			expect( WidgetTypeAround.requires ).to.deep.equal( [ Paragraph ] );
		} );
	} );

	describe( '_insertParagraph()', () => {
		let executeSpy;

		beforeEach( () => {
			executeSpy = sinon.spy( editor, 'execute' );
		} );

		it( 'should execute the "insertParagraph" command when inserting a paragraph before the widget', () => {
			setModelData( editor.model, '<blockWidget></blockWidget>' );

			plugin._insertParagraph( viewRoot.getChild( 0 ), 'before' );

			const spyExecutePosition = executeSpy.firstCall.args[ 1 ].position;
			const positionBeforeWidget = editor.model.createPositionBefore( editor.model.document.getRoot().getChild( 0 ) );

			sinon.assert.calledOnce( executeSpy );
			sinon.assert.calledWith( executeSpy, 'insertParagraph' );

			expect( spyExecutePosition.isEqual( positionBeforeWidget ) ).to.be.true;

			expect( getModelData( editor.model ) ).to.equal( '<paragraph>[]</paragraph><blockWidget></blockWidget>' );
		} );

		it( 'should execute the "insertParagraph" command when inserting a paragraph after the widget', () => {
			setModelData( editor.model, '<blockWidget></blockWidget>' );

			plugin._insertParagraph( viewRoot.getChild( 0 ), 'after' );

			const spyExecutePosition = executeSpy.firstCall.args[ 1 ].position;
			const positionAfterWidget = editor.model.createPositionAfter( editor.model.document.getRoot().getChild( 0 ) );

			sinon.assert.calledOnce( executeSpy );
			sinon.assert.calledWith( executeSpy, 'insertParagraph' );

			expect( spyExecutePosition.isEqual( positionAfterWidget ) ).to.be.true;

			expect( getModelData( editor.model ) ).to.equal( '<blockWidget></blockWidget><paragraph>[]</paragraph>' );
		} );

		it( 'should focus the editing view', () => {
			const spy = sinon.spy( editor.editing.view, 'focus' );

			setModelData( editor.model, '<blockWidget></blockWidget>' );

			plugin._insertParagraph( viewRoot.getChild( 0 ), 'after' );

			sinon.assert.calledOnce( spy );
		} );

		it( 'should scroll the editing view to the selection in an inserted paragraph', () => {
			const spy = sinon.spy( editor.editing.view, 'scrollToTheSelection' );

			setModelData( editor.model, '<blockWidget></blockWidget>' );

			plugin._insertParagraph( viewRoot.getChild( 0 ), 'after' );

			sinon.assert.calledOnce( spy );
		} );
	} );

	describe( 'UI to type around view widgets', () => {
		it( 'should be injected in block widgets', () => {
			setModelData( editor.model,
				'<paragraph>foo</paragraph>' +
				'<blockWidget></blockWidget>' +
				'<paragraph>bar</paragraph>' +
				'<blockWidget></blockWidget>'
			);

			const firstViewWidget = viewRoot.getChild( 1 );
			const lastViewWidget = viewRoot.getChild( 3 );

			expect( firstViewWidget.childCount ).to.equal( 2 );
			expect( firstViewWidget.getChild( 1 ).hasClass( 'ck-widget__type-around' ) ).to.be.true;

			expect( lastViewWidget.childCount ).to.equal( 2 );
			expect( lastViewWidget.getChild( 1 ).hasClass( 'ck-widget__type-around' ) ).to.be.true;
		} );

		it( 'should not be injected in inline widgets', () => {
			setModelData( editor.model,
				'<paragraph>foo<inlineWidget></inlineWidget></paragraph>' +
				'<paragraph><inlineWidget></inlineWidget>bar</paragraph>'
			);

			const firstViewWidget = viewRoot.getChild( 0 ).getChild( 1 );
			const lastViewWidget = viewRoot.getChild( 1 ).getChild( 0 );

			expect( firstViewWidget.childCount ).to.equal( 1 );
			expect( firstViewWidget.getChild( 0 ).is( 'text' ) ).to.be.true;
			expect( lastViewWidget.childCount ).to.equal( 1 );
			expect( lastViewWidget.getChild( 0 ).is( 'text' ) ).to.be.true;
		} );

		it( 'should inject buttons into the wrapper', () => {
			setModelData( editor.model, '<blockWidget></blockWidget>' );

			const viewWidget = viewRoot.getChild( 0 );

			expect( viewWidget.getChild( 1 ).is( 'uiElement' ) ).to.be.true;
			expect( viewWidget.getChild( 1 ).hasClass( 'ck' ) ).to.be.true;
			expect( viewWidget.getChild( 1 ).hasClass( 'ck-reset_all' ) ).to.be.true;
			expect( viewWidget.getChild( 1 ).hasClass( 'ck-widget__type-around' ) ).to.be.true;

			const domWrapper = editingView.domConverter.viewToDom( viewWidget.getChild( 1 ) );

			expect( domWrapper.querySelectorAll( '.ck-widget__type-around__button' ) ).to.have.length( 2 );
		} );

		it( 'should inject a fake caret into the wrapper', () => {
			setModelData( editor.model, '<blockWidget></blockWidget>' );

			const viewWidget = viewRoot.getChild( 0 );

			expect( viewWidget.getChild( 1 ).is( 'uiElement' ) ).to.be.true;
			expect( viewWidget.getChild( 1 ).hasClass( 'ck' ) ).to.be.true;
			expect( viewWidget.getChild( 1 ).hasClass( 'ck-reset_all' ) ).to.be.true;
			expect( viewWidget.getChild( 1 ).hasClass( 'ck-widget__type-around' ) ).to.be.true;

			const domWrapper = editingView.domConverter.viewToDom( viewWidget.getChild( 1 ) );

			expect( domWrapper.querySelectorAll( '.ck-widget__type-around__fake-caret' ) ).to.have.length( 1 );
		} );

		describe( 'UI button to type around', () => {
			let buttonBefore, buttonAfter;

			beforeEach( () => {
				setModelData( editor.model, '<blockWidget></blockWidget>' );

				const viewWidget = viewRoot.getChild( 0 );
				const domWrapper = editingView.domConverter.viewToDom( viewWidget.getChild( 1 ) );

				buttonBefore = domWrapper.children[ 0 ];
				buttonAfter = domWrapper.children[ 1 ];
			} );

			it( 'should have proper CSS classes', () => {
				expect( buttonBefore.classList.contains( 'ck' ) ).to.be.true;
				expect( buttonBefore.classList.contains( 'ck-widget__type-around__button' ) ).to.be.true;

				expect( buttonAfter.classList.contains( 'ck' ) ).to.be.true;
				expect( buttonAfter.classList.contains( 'ck-widget__type-around__button' ) ).to.be.true;
			} );

			describe( 'button to type "before" a widget', () => {
				it( 'should have a specific class', () => {
					expect( buttonBefore.classList.contains( 'ck-widget__type-around__button_before' ) ).to.be.true;
				} );

				it( 'should have a specific "title"', () => {
					expect( buttonBefore.getAttribute( 'title' ) ).to.equal( 'Insert paragraph before block' );
				} );

				it( 'should execute WidgetTypeAround#_insertParagraph() when clicked', () => {
					const preventDefaultSpy = sinon.spy();
					const typeAroundSpy = sinon.spy( plugin, '_insertParagraph' );

					const eventInfo = new EventInfo( viewDocument, 'mousedown' );
					const stopSpy = sinon.stub( eventInfo, 'stop' );
					const domEventDataMock = new DomEventData( editingView, {
						target: buttonBefore,
						preventDefault: preventDefaultSpy
					} );

					viewDocument.fire( eventInfo, domEventDataMock );

					sinon.assert.calledOnce( typeAroundSpy );
					sinon.assert.calledWithExactly( typeAroundSpy, viewRoot.getChild( 1 ), 'before' );
					sinon.assert.calledOnce( preventDefaultSpy );
					sinon.assert.calledOnce( stopSpy );
				} );

				it( 'should not cause WidgetTypeAround#_insertParagraph() when clicked something other than the button', () => {
					const typeAroundSpy = sinon.spy( plugin, '_insertParagraph' );

					const eventInfo = new EventInfo( viewDocument, 'mousedown' );
					const domEventDataMock = new DomEventData( editingView, {
						// Clicking a widget.
						target: editingView.domConverter.viewToDom( viewRoot.getChild( 0 ) ),
						preventDefault: sinon.spy()
					} );

					viewDocument.fire( eventInfo, domEventDataMock );
					sinon.assert.notCalled( typeAroundSpy );
				} );
			} );

			describe( 'button to type "after" a widget', () => {
				it( 'should have a specific class', () => {
					expect( buttonAfter.classList.contains( 'ck-widget__type-around__button_after' ) ).to.be.true;
				} );

				it( 'should have a specific "title"', () => {
					expect( buttonAfter.getAttribute( 'title' ) ).to.equal( 'Insert paragraph after block' );
				} );

				it( 'should execute WidgetTypeAround#_insertParagraph() when clicked', () => {
					const preventDefaultSpy = sinon.spy();
					const typeAroundSpy = sinon.spy( plugin, '_insertParagraph' );

					const eventInfo = new EventInfo( viewDocument, 'mousedown' );
					const stopSpy = sinon.stub( eventInfo, 'stop' );
					const domEventDataMock = new DomEventData( editingView, {
						target: buttonAfter,
						preventDefault: preventDefaultSpy
					} );

					viewDocument.fire( eventInfo, domEventDataMock );

					sinon.assert.calledOnce( typeAroundSpy );
					sinon.assert.calledWithExactly( typeAroundSpy, viewRoot.getChild( 0 ), 'after' );
					sinon.assert.calledOnce( preventDefaultSpy );
					sinon.assert.calledOnce( stopSpy );
				} );
			} );

			it( 'should have an icon', () => {
				const icon = buttonBefore.firstChild;

				expect( icon.tagName.toLowerCase() ).to.equal( 'svg' );
				expect( icon.getAttribute( 'viewBox' ) ).to.equal( '0 0 10 8' );
			} );
		} );
	} );

	describe( 'typing around view widgets using keyboard', () => {
		let model, modelSelection, eventInfoStub, domEventDataStub;

		beforeEach( () => {
			model = editor.model;
			modelSelection = model.document.selection;
		} );

		describe( '"fake caret" activation', () => {
			it( 'should activate before when the collapsed selection is before a widget and the navigation is forward', () => {
				setModelData( editor.model, '<paragraph>foo[]</paragraph><blockWidget></blockWidget>' );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '<paragraph>foo</paragraph>[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

				const viewWidget = viewRoot.getChild( 1 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.true;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should activate after when the collapsed selection is after a widget and the navigation is backward', () => {
				setModelData( editor.model, '<blockWidget></blockWidget><paragraph>[]foo</paragraph>' );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]<paragraph>foo</paragraph>' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.true;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should activate after when the widget is selected and the navigation is forward', () => {
				setModelData( editor.model, '[<blockWidget></blockWidget>]' );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.true;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should activate before when the widget is selected and the navigation is backward', () => {
				setModelData( editor.model, '[<blockWidget></blockWidget>]' );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.true;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not activate when the selection is before the widget but the non-arrow key was pressed', () => {
				setModelData( editor.model, '<paragraph>foo[]</paragraph><blockWidget></blockWidget>' );

				fireKeyboardEvent( 'a' );
				fireMutation( 'a' );

				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				expect( getModelData( model ) ).to.equal( '<paragraph>fooa[]</paragraph><blockWidget></blockWidget>' );

				const viewWidget = viewRoot.getChild( 1 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.notCalled( eventInfoStub.stop );
				sinon.assert.notCalled( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not activate when the selection is not before the widget and navigating forward', () => {
				setModelData( editor.model, '<paragraph>fo[]o</paragraph><blockWidget></blockWidget>' );

				fireKeyboardEvent( 'arrowright' );

				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 1 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.notCalled( eventInfoStub.stop );
				sinon.assert.notCalled( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not activate when the selection is not after the widget and navigating backward', () => {
				setModelData( editor.model, '<blockWidget></blockWidget><paragraph>f[]oo</paragraph>' );

				fireKeyboardEvent( 'arrowleft' );

				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.notCalled( eventInfoStub.stop );
				sinon.assert.notCalled( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not activate when the non-collapsed selection is before the widget and navigating forward', () => {
				setModelData( editor.model, '<paragraph>fo[o]</paragraph><blockWidget></blockWidget>' );

				fireKeyboardEvent( 'arrowright' );

				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 1 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.notCalled( eventInfoStub.stop );
				sinon.assert.notCalled( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not activate when the non-collapsed selection is after the widget and navigating backward', () => {
				setModelData( editor.model, '<blockWidget></blockWidget><paragraph>[f]oo</paragraph>' );

				fireKeyboardEvent( 'arrowleft' );

				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.notCalled( eventInfoStub.stop );
				sinon.assert.notCalled( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not activate selection downcast when a non–type-around-friendly widget is selected', () => {
				setModelData( editor.model, '<paragraph>foo[<inlineWidget></inlineWidget>]</paragraph>' );

				model.change( writer => {
					// Simply trigger the selection downcast.
					writer.setSelectionAttribute( 'foo', 'bar' );
				} );

				const viewWidget = viewRoot.getChild( 0 ).getChild( 1 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.notCalled( eventInfoStub.stop );
				sinon.assert.notCalled( domEventDataStub.domEvent.preventDefault );
			} );
		} );

		describe( '"fake caret" deactivation', () => {
			it( 'should deactivate when the widget is selected and the navigation is backward to a valid position', () => {
				setModelData( editor.model, '<paragraph>foo</paragraph>[<blockWidget></blockWidget>]' );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '<paragraph>foo</paragraph>[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '<paragraph>foo[]</paragraph><blockWidget></blockWidget>' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 1 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should deactivate when the widget is selected and the navigation is forward to a valid position', () => {
				setModelData( editor.model, '[<blockWidget></blockWidget>]<paragraph>foo</paragraph>' );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]<paragraph>foo</paragraph>' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '<blockWidget></blockWidget><paragraph>[]foo</paragraph>' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not deactivate when the widget is selected and the navigation is backward but there is nowhere to go', () => {
				setModelData( editor.model, '[<blockWidget></blockWidget>]' );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.true;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should not deactivate when the widget is selected and the navigation is forward but there is nowhere to go', () => {
				setModelData( editor.model, '[<blockWidget></blockWidget>]' );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.true;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should deactivate when the widget is selected and the navigation is against the fake caret (backward)', () => {
				setModelData( editor.model, '[<blockWidget></blockWidget>]' );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );

			it( 'should deactivate when the widget is selected and the navigation is against the fake caret (forward)', () => {
				setModelData( editor.model, '[<blockWidget></blockWidget>]' );

				fireKeyboardEvent( 'arrowright' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );

				fireKeyboardEvent( 'arrowleft' );

				expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
				expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

				const viewWidget = viewRoot.getChild( 0 );

				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
				expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;

				sinon.assert.calledOnce( eventInfoStub.stop );
				sinon.assert.calledOnce( domEventDataStub.domEvent.preventDefault );
			} );
		} );

		it( 'should quit the "fake caret" mode when the editor loses focus', () => {
			editor.ui.focusTracker.isFocused = true;

			setModelData( editor.model, '<paragraph>foo[]</paragraph><blockWidget></blockWidget>' );

			fireKeyboardEvent( 'arrowright' );

			expect( getModelData( model ) ).to.equal( '<paragraph>foo</paragraph>[<blockWidget></blockWidget>]' );
			expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

			editor.ui.focusTracker.isFocused = false;

			const viewWidget = viewRoot.getChild( 1 );

			expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
			expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
			expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;
		} );

		it( 'should quit the "fake caret" mode when the user changed the selection', () => {
			setModelData( editor.model, '<paragraph>foo[]</paragraph><blockWidget></blockWidget>' );

			fireKeyboardEvent( 'arrowright' );

			expect( getModelData( model ) ).to.equal( '<paragraph>foo</paragraph>[<blockWidget></blockWidget>]' );
			expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

			model.change( writer => {
				writer.setSelection( model.document.getRoot().getChild( 0 ), 'in' );
			} );

			const viewWidget = viewRoot.getChild( 1 );

			expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
			expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.false;
			expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;
		} );

		it( 'should not quit the "fake caret" mode when the selection changed as a result of an indirect change', () => {
			setModelData( editor.model, '<paragraph>foo[]</paragraph><blockWidget></blockWidget>' );

			fireKeyboardEvent( 'arrowright' );

			expect( getModelData( model ) ).to.equal( '<paragraph>foo</paragraph>[<blockWidget></blockWidget>]' );
			expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

			// This could happen in collaboration.
			model.document.selection.fire( 'change:range', {
				directChange: false
			} );

			expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

			const viewWidget = viewRoot.getChild( 1 );

			expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_before' ) ).to.be.true;
			expect( viewWidget.hasClass( 'ck-widget_type-around_show-fake-caret_after' ) ).to.be.false;
		} );

		describe( 'inserting a new paragraph', () => {
			describe( 'on Enter key press when the "fake caret" is activated', () => {
				it( 'should insert a paragraph before a widget if the caret was "before" it', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );

					fireKeyboardEvent( 'arrowleft' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

					fireKeyboardEvent( 'enter' );
					expect( getModelData( model ) ).to.equal( '<paragraph>[]</paragraph><blockWidget></blockWidget>' );
				} );

				it( 'should insert a paragraph after a widget if the caret was "after" it', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );

					fireKeyboardEvent( 'arrowright' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

					fireKeyboardEvent( 'enter' );
					expect( getModelData( model ) ).to.equal( '<blockWidget></blockWidget><paragraph>[]</paragraph>' );
				} );

				it( 'should integrate with the undo feature', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );

					fireKeyboardEvent( 'arrowleft' );
					fireKeyboardEvent( 'enter' );

					expect( getModelData( model ) ).to.equal( '<paragraph>[]</paragraph><blockWidget></blockWidget>' );

					editor.execute( 'undo' );

					expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );
			} );

			describe( 'on Enter key press when the widget is selected (no "fake caret", though)', () => {
				it( 'should insert a new paragraph after the widget if Enter was pressed', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

					fireKeyboardEvent( 'enter' );

					expect( getModelData( model ) ).to.equal( '<blockWidget></blockWidget><paragraph>[]</paragraph>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );

				it( 'should insert a new paragraph before the widget if Shift+Enter was pressed', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

					fireKeyboardEvent( 'enter', { shiftKey: true } );

					expect( getModelData( model ) ).to.equal( '<paragraph>[]</paragraph><blockWidget></blockWidget>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );

				it( 'should integrate with the undo feature', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

					fireKeyboardEvent( 'enter' );

					expect( getModelData( model ) ).to.equal( '<blockWidget></blockWidget><paragraph>[]</paragraph>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

					editor.execute( 'undo' );

					expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );

				it( 'should do nothing if a non-type-around-friendly content is selected', () => {
					setModelData( editor.model, '<paragraph>foo[<inlineWidget></inlineWidget>]</paragraph>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

					fireKeyboardEvent( 'enter' );

					expect( getModelData( model ) ).to.equal( '<paragraph>foo</paragraph><paragraph>[]</paragraph>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );
			} );

			describe( 'on typing an "unsafe" character when the "fake caret" is activated ', () => {
				it( 'should insert a character inside a new paragraph before a widget if the caret was "before" it', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );

					fireKeyboardEvent( 'arrowleft' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'before' );

					fireKeyboardEvent( 'a' );
					fireMutation( 'a' );

					expect( getModelData( model ) ).to.equal( '<paragraph>a[]</paragraph><blockWidget></blockWidget>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );

				it( 'should insert a character inside a new paragraph after a widget if the caret was "after" it', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );

					fireKeyboardEvent( 'arrowright' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

					fireKeyboardEvent( 'a' );
					fireMutation( 'a' );

					expect( getModelData( model ) ).to.equal( '<blockWidget></blockWidget><paragraph>a[]</paragraph>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );

				it( 'should do nothing if a "safe" keystroke was pressed', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );

					fireKeyboardEvent( 'arrowright' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );

					fireKeyboardEvent( 'esc' );
					fireKeyboardEvent( 'tab' );
					fireKeyboardEvent( 'd', { ctrlKey: true } );

					expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.equal( 'after' );
				} );

				it( 'should integrate with the undo feature', () => {
					setModelData( editor.model, '[<blockWidget></blockWidget>]' );

					fireKeyboardEvent( 'arrowleft' );
					fireKeyboardEvent( 'a' );
					fireMutation( 'a' );

					expect( getModelData( model ) ).to.equal( '<paragraph>a[]</paragraph><blockWidget></blockWidget>' );

					editor.execute( 'undo' );
					expect( getModelData( model ) ).to.equal( '<paragraph>[]</paragraph><blockWidget></blockWidget>' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;

					editor.execute( 'undo' );
					expect( getModelData( model ) ).to.equal( '[<blockWidget></blockWidget>]' );
					expect( modelSelection.getAttribute( 'widget-type-around' ) ).to.be.undefined;
				} );
			} );
		} );

		function getDomEvent() {
			return {
				preventDefault: sinon.spy(),
				stopPropagation: sinon.spy()
			};
		}

		function fireKeyboardEvent( key, modifiers ) {
			eventInfoStub = new EventInfo( viewDocument, 'keydown' );

			sinon.spy( eventInfoStub, 'stop' );

			const data = {
				document: viewDocument,
				domTarget: editingView.getDomRoot(),
				keyCode: getCode( key )
			};

			Object.assign( data, modifiers );

			domEventDataStub = new DomEventData( viewDocument, getDomEvent(), data );

			viewDocument.fire( eventInfoStub, domEventDataStub );
		}

		function fireMutation( text ) {
			const placeOfMutation = viewDocument.selection.getFirstRange().start;

			viewDocument.fire( 'mutations', [
				{
					type: 'children',
					oldChildren: [],
					newChildren: [ new ViewText( viewDocument, text ) ],
					node: placeOfMutation
				}
			] );
		}
	} );

	function blockWidgetPlugin( editor ) {
		editor.model.schema.register( 'blockWidget', {
			inheritAllFrom: '$block',
			isObject: true
		} );

		editor.conversion.for( 'downcast' )
			.elementToElement( {
				model: 'blockWidget',
				view: ( modelItem, viewWriter ) => {
					const container = viewWriter.createContainerElement( 'div' );
					const viewText = viewWriter.createText( 'block-widget' );

					viewWriter.insert( viewWriter.createPositionAt( container, 0 ), viewText );

					return toWidget( container, viewWriter, {
						label: 'block widget'
					} );
				}
			} );
	}

	function inlineWidgetPlugin( editor ) {
		editor.model.schema.register( 'inlineWidget', {
			allowWhere: '$text',
			isObject: true,
			isInline: true
		} );

		editor.conversion.for( 'downcast' )
			.elementToElement( {
				model: 'inlineWidget',
				view: ( modelItem, viewWriter ) => {
					const container = viewWriter.createContainerElement( 'inlineWidget' );
					const viewText = viewWriter.createText( 'inline-widget' );

					viewWriter.insert( viewWriter.createPositionAt( container, 0 ), viewText );

					return toWidget( container, viewWriter, {
						label: 'inline widget'
					} );
				}
			} );
	}
} );
